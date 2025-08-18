from flask import Flask, render_template, request, jsonify, redirect, send_from_directory, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import SQLAlchemyError
from flask_wtf.csrf import CSRFProtect
import logging
from logging.handlers import RotatingFileHandler
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from functools import wraps
import os
from datetime import datetime, timedelta
import uuid
import json
import re
import unicodedata
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from models import (
    db, User, MerchantStore, Ad, Category, Country, State, City,
    VIPPackage, VIPSubscription, AdSense, PaymentMethod, SiteSetting
)
from routes import bp as merchant_bp

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)  # تعيين مدة الجلسة ليوم واحد
database_url = os.environ.get('DATABASE_URL')
if database_url and database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = database_url or 'sqlite:///classified_ads.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'static/uploads'
# Remove file size limits
app.config['MAX_CONTENT_LENGTH'] = None  # No limit on total upload size
app.config['MAX_FILE_SIZE'] = None  # No limit on individual file size
app.config['MAX_FILES'] = None  # No limit on number of files
app.config['WTF_CSRF_ENABLED'] = True

db.init_app(app)
csrf = CSRFProtect(app)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'admin_login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(user_id)

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Set up logging
if not app.debug:
    # Create logs directory if it doesn't exist
    if not os.path.exists('logs'):
        os.mkdir('logs')
    # Set up file handler
    file_handler = RotatingFileHandler('logs/adsvairl.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    
    app.logger.setLevel(logging.INFO)
    app.logger.info('Adsvairl startup')

# Register blueprints
app.register_blueprint(merchant_bp, url_prefix='/merchant')

# Site Settings Functions
def get_site_setting(key, default=None):
    setting = SiteSetting.query.filter_by(key=key).first()
    return setting.value if setting else default

def set_site_setting(key, value, description=None):
    setting = SiteSetting.query.filter_by(key=key).first()
    if setting:
        setting.value = value
        setting.updated_at = datetime.utcnow()
    else:
        setting = SiteSetting(key=key, value=value, description=description)
        db.session.add(setting)
    db.session.commit()




# Context Processor for Global Template Variables
@app.context_processor
def inject_settings():
    return {
        'show_vip_section': get_site_setting('show_vip_section', 'true') == 'true'
    }

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('يجب تسجيل الدخول أولاً', 'error')
            return redirect(url_for('become_vip'))
        return f(*args, **kwargs)
    return decorated_function

# VIP required decorator
def vip_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('يجب تسجيل الدخول أولاً للوصول إلى ميزات VIP', 'error')
            return redirect(url_for('become_vip'))
        user = User.query.get(session['user_id'])
        if not user or not user.is_vip:
            flash('هذه الصفحة متاحة فقط للأعضاء VIP', 'error')
            return redirect(url_for('become_vip'))
        return f(*args, **kwargs)
    return decorated_function

# Admin required decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_id' not in session:
            return redirect(url_for('admin_login', next=request.url))
        user = User.query.get(session['admin_id'])
        if not user or not user.is_admin:
            flash('هذه الصفحة متاحة فقط للمشرفين', 'error')
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function


# Admin Settings Route
@app.route('/admin/settings/toggle-vip-section', methods=['POST'])
@admin_required
def toggle_vip_section():
    current_status = request.form.get('status')
    if current_status not in ['true', 'false']:
        return jsonify({'error': 'Invalid status value'}), 400
        
    set_site_setting('show_vip_section', current_status, 'Controls visibility of VIP section on homepage')
    
    return jsonify({
        'success': True,
        'message': 'تم تحديث إعدادات قسم VIP بنجاح',
        'status': current_status
    })

# VIP Package Management Routes - Main Route
@app.route('/admin/vip-packages')
@admin_required
def admin_vip_packages_main():
    packages = VIPPackage.query.order_by(VIPPackage.created_at.desc()).all()
    countries = Country.query.filter_by(is_active=True).all()
    return render_template('admin/vip_packages.html', packages=packages, countries=countries)

@app.route('/api/payment-methods/by-package/<package_id>')
def get_package_payment_methods(package_id):
    package = VIPPackage.query.get_or_404(package_id)
    payment_methods = package.payment_methods
    return jsonify([{
        'id': method.id,
        'name': method.name,
        'name_en': method.name_en,
        'code': method.code,
        'icon': method.icon,
        'requires_proof': method.requires_proof,
        'account_name': method.account_name,
        'bank_name': method.bank_name,
        'account_number': method.account_number,
        'iban': method.iban,
        'instructions': method.instructions
    } for method in payment_methods if method.is_active])

@app.route('/admin/vip-packages/add', methods=['POST'])
@admin_required
def add_vip_package_main():
    try:
        # Create the package
        package = VIPPackage(
            name=request.form.get('name'),
            name_en=request.form.get('name_en'),
            description=request.form.get('description'),
            duration_days=int(request.form.get('duration_days')),
            price=float(request.form.get('price')),
            currency=request.form.get('currency'),
            country_id=request.form.get('country_id'),
            featured_ads_count=int(request.form.get('featured_ads_count', 0)),
            priority_support=bool(request.form.get('priority_support')),
            advanced_analytics=bool(request.form.get('advanced_analytics')),
            custom_badge=request.form.get('custom_badge'),
            boost_in_search=bool(request.form.get('boost_in_search')),
            is_active=True
        )
        
        # Get selected payment methods
        payment_method_ids = request.form.getlist('payment_methods[]')
        if not payment_method_ids:
            flash('يجب اختيار طريقة دفع واحدة على الأقل', 'error')
            return redirect(url_for('admin_vip_packages_main'))

        # Add payment methods to the package
        payment_methods = PaymentMethod.query.filter(
            PaymentMethod.id.in_(payment_method_ids),
            PaymentMethod.is_active == True
        ).all()
        
        package.payment_methods.extend(payment_methods)
        
        db.session.add(package)
        db.session.commit()
        flash('تم إضافة الباقة بنجاح', 'success')
        
    except Exception as e:
        db.session.rollback()
        flash(f'خطأ في إضافة الباقة: {str(e)}', 'error')
    
    return redirect(url_for('admin_vip_packages_main'))

@app.route('/admin/vip-packages/<package_id>/delete', methods=['POST'])
@admin_required
def delete_vip_package_main(package_id):
    package = VIPPackage.query.get_or_404(package_id)
    db.session.delete(package)
    db.session.commit()
    flash('تم حذف الباقة', 'success')
    return redirect(url_for('admin_vip_packages_main'))

@app.route('/admin/vip-packages/<package_id>/toggle', methods=['POST'])
@admin_required
def toggle_vip_package_main(package_id):
    package = VIPPackage.query.get_or_404(package_id)
    package.is_active = not package.is_active
    db.session.commit()
    status = 'تفعيل' if package.is_active else 'تعطيل'
    flash(f'تم {status} الباقة بنجاح', 'success')
    return redirect(url_for('admin_vip_packages_main'))
        

# Helper function to create URL slug from Arabic text
def create_slug(text):
    """Convert Arabic text to URL-friendly slug"""
    # Remove HTML tags if any
    text = re.sub('<.*?>', '', text)
    
    # Replace Arabic spaces and punctuation
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    
    # Remove leading/trailing hyphens
    text = text.strip('-')
    
    # Limit length
    if len(text) > 50:
        text = text[:50].rstrip('-')
    
    return text.lower() if text else 'ad'

# Helper function for Arabic time ago
def time_ago_arabic(dt):
    now = datetime.now()
    diff = now - dt
    
    if diff.days > 30:
        return f"منذ {diff.days // 30} شهر" if diff.days // 30 == 1 else f"منذ {diff.days // 30} أشهر"
    elif diff.days > 0:
        return f"منذ {diff.days} يوم" if diff.days == 1 else f"منذ {diff.days} أيام"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"منذ {hours} ساعة" if hours == 1 else f"منذ {hours} ساعات"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"منذ {minutes} دقيقة" if minutes == 1 else f"منذ {minutes} دقائق"
    else:
        return "منذ قليل"

# Register the function as a template filter
@app.template_filter('time_ago')
def time_ago_filter(dt):
    return time_ago_arabic(dt)

# Register the slug function as a template filter  
@app.template_filter('slug')
def slug_filter(text):
    return create_slug(text)

# Helper function to format phone number for WhatsApp
def format_phone_for_whatsapp(phone):
    """Format phone number for WhatsApp URL"""
    if not phone:
        return ""
    
    # Remove all non-digit characters except +
    phone = re.sub(r'[^\d+]', '', phone)
    
    # If starts with 0, replace with +966 (Saudi Arabia)
    if phone.startswith('0'):
        phone = '+966' + phone[1:]
    elif not phone.startswith('+'):
        # Add +966 if no country code
        phone = '+966' + phone
    
    return phone.replace('+', '')


@app.route('/ads.txt')
def ads_txt():
    return send_from_directory('static', 'ads.txt')


# Register the phone format function as a template filter
@app.template_filter('whatsapp_phone')
def whatsapp_phone_filter(phone):
    return format_phone_for_whatsapp(phone)
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(50), unique=True, nullable=False)  # bank_transfer, mada, visa, etc.
    icon = db.Column(db.String(50))  # CSS class or image path
    country_id = db.Column(db.String(36), db.ForeignKey('country.id'), nullable=False)
    
    # Payment method details
    requires_proof = db.Column(db.Boolean, default=False)  # Bank transfers require proof
    instructions = db.Column(db.Text)  # Payment instructions in Arabic
    instructions_en = db.Column(db.Text)  # Payment instructions in English
    
    # Account details (for bank transfers)
    account_name = db.Column(db.String(100))
    account_number = db.Column(db.String(50))
    bank_name = db.Column(db.String(100))
    iban = db.Column(db.String(50))
    swift_code = db.Column(db.String(20))
    
    is_active = db.Column(db.Boolean, default=True)
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    country = db.relationship('Country', backref='payment_methods')

# Routes
def get_adsense_ads(page_location=None, ad_type=None):
    """Helper function to get AdSense ads for a specific page and type"""
    query = AdSense.query.filter_by(is_active=True)
    
    if ad_type:
        query = query.filter_by(ad_type=ad_type)
    
    # Sort by display order
    query = query.order_by(AdSense.display_order.asc())
    
    return query.all()

@app.route('/')
def home():
    # Check if user has seen splash screen
    if not session.get('seen_splash'):
        session['seen_splash'] = True
        return render_template('splash.html')
        
    categories = Category.query.filter_by(is_active=True).all()
    featured_ads = Ad.query.filter_by(is_featured=True, is_approved=True, is_active=True).limit(6).all()
    recent_ads = Ad.query.filter_by(is_approved=True, is_active=True).order_by(Ad.created_at.desc()).limit(12).all()
    
    # Get location data for filters - convert to dictionaries for JSON serialization
    countries = Country.query.filter_by(is_active=True).all()
    states_query = State.query.all()
    cities_query = City.query.all()
    
    # Convert to dictionaries for JSON serialization
    states = [{'id': s.id, 'name': s.name, 'country_id': s.country_id} for s in states_query]
    cities = [{'id': c.id, 'name': c.name, 'state_id': c.state_id} for c in cities_query]
    
    # Get AdSense ads for home page
    adsense_ads = {
        'banner': get_adsense_ads(ad_type='banner'),
        'sidebar': get_adsense_ads(ad_type='sidebar'),
        'content': get_adsense_ads(ad_type='content'),
        'footer': get_adsense_ads(ad_type='footer')
    }
    
    return render_template('index.html', 
                         categories=categories, 
                         featured_ads=featured_ads, 
                         recent_ads=recent_ads,
                         countries=countries,
                         states=states,
                         cities=cities,
                         adsense_ads=adsense_ads)



@app.route('/ad/<ad_id>')
@app.route('/ad/<ad_id>/<slug>')
def ad_details(ad_id, slug=None):
    ad = Ad.query.get_or_404(ad_id)
    
    # Create the correct slug for this ad
    correct_slug = create_slug(ad.title)
    
    # If no slug provided or incorrect slug, redirect to correct URL
    if not slug or slug != correct_slug:
        return redirect(url_for('ad_details', ad_id=ad_id, slug=correct_slug), code=301)
    
    # Increment view count
    ad.views_count += 1
    db.session.commit()
    
    # Get related ads from same category
    related_ads = Ad.query.filter(
        Ad.category_id == ad.category_id,
        Ad.id != ad.id,
        Ad.is_approved == True,
        Ad.is_active == True
    ).limit(4).all()
    
    return render_template('ad_details.html', ad=ad, related_ads=related_ads)

@app.route('/all-ads')
def all_ads():
    page = request.args.get('page', 1, type=int)
    per_page = 12
    
    ads = Ad.query.filter_by(is_approved=True, is_active=True)\
             .order_by(Ad.created_at.desc())\
             .paginate(page=page, per_page=per_page, error_out=False)
    
    return render_template('all_ads.html', ads=ads)

@app.route('/add-ad')
def add_ad():
    categories = Category.query.filter_by(is_active=True).all()
    countries = Country.query.filter_by(is_active=True).all()
    return render_template('add_ad.html', categories=categories, countries=countries)

@app.route('/api/categories')
def get_categories():
    categories = Category.query.filter_by(is_active=True).all()
    return jsonify([{
        'id': cat.id,
        'name': cat.name,
        'name_en': cat.name_en,
        'icon': cat.icon,
        'color': cat.color
    } for cat in categories])



def auto_create_user(phone, email=None, location_data=None):
    """Create a new user account automatically"""
    try:
        # Check if user already exists with this email
        if email:
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                # Return existing user without password since account already exists
                session['user_id'] = existing_user.id
                return existing_user, None

        # Generate a random password
        import random
        import string
        password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
        
        # Create username from phone number
        username = f"user_{phone.replace('+', '').replace('-', '')}"
        
        # Check if username exists and modify if needed
        base_username = username
        counter = 1
        while User.query.filter_by(username=username).first():
            username = f"{base_username}_{counter}"
            counter += 1
        
        # Create new user
        user = User(
            username=username,
            email=email if email else f"{username}@temp.com",
            phone=phone,
            is_active=True
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        # Store user session
        session['user_id'] = user.id
        
        return user, password
    except Exception as e:
        db.session.rollback()
        raise e

@app.route('/api/ads', methods=['POST'])
def create_ad():
    try:
        # Configure logging
        app.logger.setLevel(logging.DEBUG)
        
        if 'UPLOAD_FOLDER' not in app.config:
            app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
            
        app.logger.debug(f"Form data received: {request.form}")
        app.logger.debug(f"Files received: {request.files}")
        
        # Ensure upload directory exists
        if not os.path.exists(app.config['UPLOAD_FOLDER']):
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        # Get uploaded files without size restrictions
        files = request.files.getlist('images')
        # Verify required fields
        required_fields = ['title', 'description', 'price', 'category_id', 'country_id']
        for field in required_fields:
            if not request.form.get(field):
                return jsonify({
                    'error': f'Missing required field: {field}',
                    'message': 'يرجى ملء جميع الحقول المطلوبة'
                }), 400
                
        # Get contact information
        contact_phone = request.form.get('contact_phone')
        contact_email = request.form.get('contact_email')
        
        # Check if we need to create a new user
        if 'user_id' not in session and contact_phone:
            # Check if phone is already registered
            existing_user = User.query.filter_by(phone=contact_phone).first()
            
            if existing_user:
                # Log in the existing user
                session['user_id'] = existing_user.id
                new_account = False
                temp_password = None
            else:
                # Create new user account
                location_data = {
                    'country_id': request.form.get('country_id'),
                    'state_id': request.form.get('state_id'),
                    'city_id': request.form.get('city_id')
                }
                user, temp_password = auto_create_user(contact_phone, contact_email, location_data)
                new_account = True

        # Validate price
        try:
            price = float(request.form.get('price'))
            if price < 0:
                return jsonify({
                    'error': 'Invalid price',
                    'message': 'السعر يجب أن يكون رقماً موجباً'
                }), 400
        except ValueError:
            return jsonify({
                'error': 'Invalid price format',
                'message': 'صيغة السعر غير صحيحة'
            }), 400

        # Handle file uploads
        uploaded_files = request.files.getlist('images')
        
        # Save images
        image_paths = []
        for file in uploaded_files:
            if file and file.filename:
                filename = secure_filename(file.filename)
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                image_paths.append(filename)

        # Create new ad
        new_ad = Ad(
            title=request.form.get('title'),
            description=request.form.get('description'),
            price=float(request.form.get('price')),
            category_id=request.form.get('category_id'),
            country_id=request.form.get('country_id'),
            state_id=request.form.get('state_id'),
            city_id=request.form.get('city_id'),
            user_id=session.get('user_id'),
            contact_phone=contact_phone,
            contact_email=contact_email,
            images=image_paths,
            currency=request.form.get('currency', 'SAR'),
            is_active=True,
            is_approved=True
        )
        
        db.session.add(new_ad)
        db.session.commit()

        # Create slug from title
        ad_slug = create_slug(new_ad.title)
        
        # Build the ad URL
        ad_url = url_for('ad_details', ad_id=new_ad.id, slug=ad_slug, _external=True)

        response_data = {
            'success': True,
            'message': 'تم نشر إعلانك بنجاح',
            'ad_id': new_ad.id,
            'ad_url': ad_url,
            'redirect_url': ad_url
        }

        if 'temp_password' in locals() and temp_password:
            response_data.update({
                'account_created': True,
                'username': contact_phone,
                'password': temp_password,
                'account_message': 'تم إنشاء حساب جديد لك. احتفظ بمعلومات الدخول.'
            })

        return jsonify(response_data)
    except Exception as e:
        db.session.rollback()  # Roll back any failed database changes
        app.logger.error(f"Error in create_ad: {str(e)}", exc_info=True)  # Log full traceback
        return jsonify({
            'success': False,
            'message': 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى',
            'debug_info': str(e) if app.debug else None
        }), 500
        


@app.route('/category/<category_id>')
def category_view(category_id):
    category = Category.query.get_or_404(category_id)
    ads = Ad.query.filter_by(category_id=category_id, is_approved=True, is_active=True).order_by(Ad.created_at.desc()).all()
    countries = Country.query.filter_by(is_active=True).all()
    
    return render_template('category.html', category=category, ads=ads, countries=countries)

# Admin authentication decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_id' not in session:
            next_url = request.url if request.method == 'GET' else None
            return redirect(url_for('admin_login', next=next_url))
        
        user = User.query.get(session['admin_id'])
        if not user or not user.is_admin:
            session.clear()  # تنظيف بيانات الجلسة
            flash('غير مصرح لك بالوصول إلى لوحة التحكم', 'error')
            return redirect(url_for('admin_login'))
            
        # تحديث الجلسة لتجنب مشاكل التوجيه
        session.permanent = True
        return f(*args, **kwargs)
    return decorated_function

# Admin routes
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    # تنظيف الجلسة السابقة
    if 'admin_id' not in session and 'user_id' in session:
        session.clear()
    
    # إذا كان المستخدم مسجل دخول كأدمن، قم بتوجيهه للوحة التحكم
    if 'admin_id' in session:
        user = User.query.get(session['admin_id'])
        if user and user.is_admin:
            return redirect(url_for('admin_dashboard'))
    
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        if not email or not password:
            flash('يرجى إدخال البريد الإلكتروني وكلمة المرور', 'error')
            return render_template('admin/login.html')
        
        admin = User.query.filter_by(email=email, is_admin=True).first()
        
        if admin and check_password_hash(admin.password_hash, password):
            # تنظيف الجلسة وإضافة بيانات الأدمن
            session.clear()
            session['admin_id'] = admin.id
            session['is_admin'] = True
            session.permanent = True  # جعل الجلسة دائمة
            
            flash('تم تسجيل الدخول بنجاح', 'success')
            
            # التوجيه للصفحة المطلوبة
            next_page = request.args.get('next')
            if next_page and next_page.startswith('/'):
                return redirect(next_page)
            return redirect(url_for('admin_dashboard'))
        else:
            flash('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error')
    
    return render_template('admin/login.html')

@app.route('/admin/logout')
def admin_logout():
    session.pop('user_id', None)
    session.pop('is_admin', None)
    flash('تم تسجيل الخروج بنجاح', 'success')
    return redirect(url_for('admin_login'))

@app.route('/admin')
@app.route('/admin/dashboard')
@admin_required
def admin_dashboard():
    # Get statistics
    total_ads = Ad.query.count()
    pending_ads = Ad.query.filter_by(is_approved=False).count()
    total_users = User.query.filter_by(is_admin=False).count()
    featured_ads = Ad.query.filter_by(is_featured=True).count()
    
    # Get recent ads
    recent_ads = Ad.query.order_by(Ad.created_at.desc()).limit(10).all()
    
    return render_template('admin/dashboard.html', 
                         total_ads=total_ads,
                         pending_ads=pending_ads,
                         total_users=total_users,
                         featured_ads=featured_ads,
                         recent_ads=recent_ads)

@app.route('/admin/ads')
@admin_required
def admin_ads():
    page = request.args.get('page', 1, type=int)
    status = request.args.get('status', 'all')
    
    query = Ad.query
    
    if status == 'pending':
        query = query.filter_by(is_approved=False)
    elif status == 'approved':
        query = query.filter_by(is_approved=True)
    elif status == 'featured':
        query = query.filter_by(is_featured=True)
    
    ads = query.order_by(Ad.created_at.desc()).paginate(
        page=page, per_page=20, error_out=False)
    
    return render_template('admin/ads.html', ads=ads, status=status)

@app.route('/admin/ads/<ad_id>/approve', methods=['POST'])
@admin_required
def approve_ad(ad_id):
    ad = Ad.query.get_or_404(ad_id)
    ad.is_approved = True
    db.session.commit()
    flash('تم الموافقة على الإعلان', 'success')
    return redirect(url_for('admin_ads'))

@app.route('/admin/ads/<ad_id>/reject', methods=['POST'])
@admin_required
def reject_ad(ad_id):
    ad = Ad.query.get_or_404(ad_id)
    ad.is_approved = False
    ad.is_active = False
    db.session.commit()
    flash('تم رفض الإعلان', 'success')
    return redirect(url_for('admin_ads'))

@app.route('/admin/ads/<ad_id>/feature', methods=['POST'])
@admin_required
def feature_ad(ad_id):
    ad = Ad.query.get_or_404(ad_id)
    ad.is_featured = not ad.is_featured
    db.session.commit()
    status = 'إزالة التمييز' if not ad.is_featured else 'تمييز'
    flash(f'تم {status} الإعلان', 'success')
    return redirect(url_for('admin_ads'))

@app.route('/admin/ads/<ad_id>/delete', methods=['POST'])
@admin_required
def delete_ad(ad_id):
    ad = Ad.query.get_or_404(ad_id)
    
    # Delete associated images
    for image in ad.images or []:
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], image)
        if os.path.exists(image_path):
            os.remove(image_path)
    
    db.session.delete(ad)
    db.session.commit()
    flash('تم حذف الإعلان', 'success')
    return redirect(url_for('admin_ads'))

@app.route('/admin/categories')
@admin_required
def admin_categories():
    categories = Category.query.all()
    return render_template('admin/categories.html', categories=categories)

@app.route('/admin/categories/add', methods=['POST'])
@admin_required
def add_category():
    name = request.form.get('name')
    name_en = request.form.get('name_en')
    icon = request.form.get('icon')
    color = request.form.get('color')
    
    category = Category(name=name, name_en=name_en, icon=icon, color=color)
    db.session.add(category)
    db.session.commit()
    
    flash('تم إضافة القسم بنجاح', 'success')
    return redirect(url_for('admin_categories'))

@app.route('/admin/users')
@admin_required
def admin_users():
    users = User.query.filter_by(is_admin=False).all()
    return render_template('admin/users.html', users=users)

# AdSense Management Routes
#############################

@app.route('/admin/adsense')
@admin_required
def admin_adsense():
    adsense_ads = AdSense.query.order_by(AdSense.created_at.desc()).all()
    return render_template('admin/adsense.html', adsense_ads=adsense_ads)

@app.route('/admin/adsense/add', methods=['GET', 'POST'])
@admin_required
def admin_adsense_add():
    if request.method == 'POST':
        try:
            adsense_ad = AdSense(
                name=request.form.get('name'),
                description=request.form.get('description'),
                html_code=request.form.get('html_code'),
                ad_type=request.form.get('ad_type'),
                display_order=int(request.form.get('display_order', 0)),
                start_date=datetime.strptime(request.form.get('start_date'), '%Y-%m-%d') if request.form.get('start_date') else None,
                end_date=datetime.strptime(request.form.get('end_date'), '%Y-%m-%d') if request.form.get('end_date') else None,
                is_active=request.form.get('is_active') == 'on'
            )
            
            db.session.add(adsense_ad)
            db.session.commit()
            flash('تم إضافة إعلان AdSense بنجاح', 'success')
            return redirect(url_for('admin_adsense'))
            
        except Exception as e:
            flash(f'حدث خطأ: {str(e)}', 'error')
    
    return render_template('admin/adsense_form.html', ad=None)

@app.route('/admin/adsense/<ad_id>/edit', methods=['GET', 'POST'])
@admin_required
def admin_adsense_edit(ad_id):
    adsense_ad = AdSense.query.get_or_404(ad_id)
    
    if request.method == 'POST':
        try:
            # Get required fields
            name = request.form.get('name')
            ad_type = request.form.get('ad_type')
            html_code = request.form.get('html_code')
            
            # Validate required fields
            if not name or not ad_type or not html_code:
                flash('يرجى ملء جميع الحقول المطلوبة', 'error')
                return render_template('admin/adsense_form.html', ad=adsense_ad)
            
            # Update the AdSense ad
            adsense_ad.name = name
            adsense_ad.description = request.form.get('description')
            adsense_ad.html_code = html_code
            adsense_ad.ad_type = ad_type
            adsense_ad.display_order = int(request.form.get('display_order', 0))
            
            # Handle dates
            if request.form.get('start_date'):
                adsense_ad.start_date = datetime.strptime(request.form.get('start_date'), '%Y-%m-%d')
            if request.form.get('end_date'):
                adsense_ad.end_date = datetime.strptime(request.form.get('end_date'), '%Y-%m-%d')
                
            adsense_ad.is_active = request.form.get('is_active') == 'on'
            adsense_ad.updated_at = datetime.utcnow()
            
            db.session.commit()
            flash('تم تحديث إعلان AdSense بنجاح', 'success')
            return redirect(url_for('admin_adsense'))
            
        except ValueError as e:
            db.session.rollback()
            flash('خطأ في تنسيق التاريخ', 'error')
        except Exception as e:
            db.session.rollback()
            flash(f'حدث خطأ: {str(e)}', 'error')
    
    return render_template('admin/adsense_form.html', ad=adsense_ad)

@app.route('/admin/adsense/<ad_id>/toggle', methods=['POST'])
@admin_required
def admin_adsense_toggle(ad_id):
    adsense_ad = AdSense.query.get_or_404(ad_id)
    adsense_ad.is_active = not adsense_ad.is_active
    adsense_ad.updated_at = datetime.utcnow()
    db.session.commit()
    
    status = 'تم تفعيل' if adsense_ad.is_active else 'تم إلغاء تفعيل'
    flash(f'{status} إعلان AdSense', 'success')
    return redirect(url_for('admin_adsense'))

@app.route('/admin/adsense/<ad_id>/delete', methods=['POST'])
@admin_required
def admin_adsense_delete(ad_id):
    adsense_ad = AdSense.query.get_or_404(ad_id)
    db.session.delete(adsense_ad)
    db.session.commit()
    flash('تم حذف إعلان AdSense', 'success')
    return redirect(url_for('admin_adsense'))

@app.route('/search')
def search():
    query = request.args.get('q', '')
    category_id = request.args.get('category')
    country_id = request.args.get('country_id')
    state_id = request.args.get('state_id')
    city_id = request.args.get('city_id')
    
    ads_query = Ad.query.filter_by(is_approved=True, is_active=True)
    
    if query:
        ads_query = ads_query.filter(
            Ad.title.contains(query) | Ad.description.contains(query)
        )
    
    if category_id:
        ads_query = ads_query.filter_by(category_id=category_id)
    
    if country_id:
        ads_query = ads_query.filter_by(country_id=country_id)
    
    if state_id:
        ads_query = ads_query.filter_by(state_id=state_id)
    
    if city_id:
        ads_query = ads_query.filter_by(city_id=city_id)
    
    ads = ads_query.order_by(Ad.created_at.desc()).all()
    categories = Category.query.filter_by(is_active=True).all()
    countries = Country.query.filter_by(is_active=True).all()
    
    return render_template('search.html', ads=ads, categories=categories, 
                         countries=countries, query=query, selected_category=category_id,
                         selected_country=country_id, selected_state=state_id, 
                         selected_city=city_id)

# VIP System Routes
@app.route('/become-vip')
def become_vip():
    countries = Country.query.filter_by(is_active=True).all()
    packages = VIPPackage.query.filter_by(is_active=True).all()
    return render_template('become_vip.html', countries=countries, packages=packages)

@app.route('/api/vip-packages/country/<country_code>')
def get_vip_packages_by_country(country_code):
    try:
        country = Country.query.filter_by(code=country_code.upper()).first_or_404()
        packages = VIPPackage.query.filter_by(country_id=country.id, is_active=True).all()
        
        packages_data = []
        for package in packages:
            payment_methods = [{
                'id': pm.id,
                'name': pm.name,
                'name_en': pm.name_en,
                'code': pm.code,
                'icon': pm.icon,
                'requires_proof': pm.requires_proof,
                'instructions': pm.instructions
            } for pm in package.payment_methods if pm.is_active]
            
            packages_data.append({
                'id': package.id,
                'name': package.name,
                'name_en': package.name_en,
                'description': package.description,
                'duration_days': package.duration_days,
                'price': float(package.price),
                'currency': package.currency,
                'featured_ads_count': package.featured_ads_count,
                'priority_support': package.priority_support,
                'advanced_analytics': package.advanced_analytics,
                'boost_in_search': package.boost_in_search,
                'custom_badge': package.custom_badge,
                'payment_methods': payment_methods
            })
        
        return jsonify({
            'status': 'success',
            'packages': packages_data
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/vip-packages/<country_id>')
def get_vip_packages(country_id):
    packages = VIPPackage.query.filter_by(country_id=country_id, is_active=True).all()
    return jsonify([{
        'id': package.id,
        'name': package.name,
        'description': package.description,
        'duration_days': package.duration_days,
        'price': float(package.price),
        'currency': package.currency,
        'featured_ads_count': package.featured_ads_count,
        'priority_support': package.priority_support,
        'advanced_analytics': package.advanced_analytics,
        'custom_badge': package.custom_badge,
        'boost_in_search': package.boost_in_search,
        'payment_methods': package.payment_methods
    } for package in packages])

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/vip/subscribe', methods=['POST'])
def vip_subscribe():
    try:
        form_data = request.form.to_dict()
        
        # Validate required fields
        required_fields = {
            'package_id': 'يرجى اختيار باقة',
            'payment_method': 'يرجى اختيار طريقة دفع',
            'customer_email': 'يرجى إدخال البريد الإلكتروني',
            'customer_name': 'يرجى إدخال الاسم الكامل',
            'customer_phone': 'يرجى إدخال رقم الهاتف'
        }
        
        for field, message in required_fields.items():
            if field not in form_data or not form_data[field]:
                return jsonify({'error': message}), 400
        
        # Get package and payment method
        package = VIPPackage.query.get_or_404(form_data['package_id'])
        payment_method = PaymentMethod.query.get_or_404(form_data['payment_method'])
        
        # Handle file upload for bank transfers
        payment_proof_path = None
        if payment_method.requires_proof:
            if 'payment_proof' not in request.files:
                return jsonify({'error': 'يرجى إرفاق إثبات الدفع'}), 400
            
            file = request.files['payment_proof']
            if file.filename == '':
                return jsonify({'error': 'لم يتم اختيار ملف'}), 400
            
            if file and allowed_file(file.filename):
                filename = secure_filename(f'vip_proof_{form_data["customer_email"]}_{uuid.uuid4()}.{file.filename.rsplit(".", 1)[1].lower()}')
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                payment_proof_path = filename
            else:
                return jsonify({'error': 'نوع الملف غير مدعوم. المسموح به: صور أو PDF'}), 400
        
        if payment_method.requires_proof and not (form_data.get('transfer_reference') and form_data.get('transfer_date')):
            return jsonify({'error': 'يرجى إدخال رقم المرجع وتاريخ التحويل'}), 400
            
        try:
            # Create subscription end date
            subscription_end = datetime.utcnow() + timedelta(days=package.duration_days)
            
            # Create or fetch user
            email = form_data['customer_email']
            user = User.query.filter_by(email=email).first()
            
            if not user:
                # Create new user
                username = email.split('@')[0]
                temp_password = str(uuid.uuid4())[:8]
                user = User(
                    username=username,
                    email=email,
                    phone=form_data.get('customer_phone'),
                    password_hash=generate_password_hash(temp_password),
                    is_active=True,
                    is_vip=False  # Will be set to True after payment verification
                )
                db.session.add(user)
                db.session.flush()  # Get user.id without committing
                
                # Create merchant store
                store = MerchantStore(
                    owner_id=user.id,
                    name=f"متجر {form_data['customer_name']}",
                    description="متجر عضو VIP"
                )
                db.session.add(store)
            else:
                # Update existing user's information
                user.phone = form_data.get('customer_phone')
                if not user.store:
                    # Create merchant store if doesn't exist
                    store = MerchantStore(
                        owner_id=user.id,
                        name=f"متجر {form_data['customer_name']}",
                        description="متجر عضو VIP"
                    )
                    db.session.add(store)
            
            # Create VIP subscription
            subscription = VIPSubscription(
                user_id=user.id,
                package_id=package.id,
                start_date=datetime.utcnow(),
                end_date=subscription_end,
                payment_status='pending',
                payment_method=payment_method.code,
                payment_details={
                    'method_id': payment_method.id,
                    'method_name': payment_method.name,
                    'proof_path': payment_proof_path,
                    'reference': form_data.get('transfer_reference'),
                    'transfer_date': form_data.get('transfer_date'),
                    'customer_name': form_data.get('customer_name'),
                    'customer_phone': form_data.get('customer_phone'),
                    'state_id': form_data.get('state_id'),
                    'city_id': form_data.get('city_id'),
                    'created_at': datetime.utcnow().isoformat()
                },
                is_active=False  # Will be activated after payment verification
            )
            
            db.session.add(subscription)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'تم إرسال طلب الاشتراك بنجاح وسيتم مراجعته',
                'subscription_id': subscription.id
            })
            
        except SQLAlchemyError as e:
            db.session.rollback()
            app.logger.error(f'Database error in vip_subscribe: {str(e)}')
            return jsonify({'error': 'حدث خطأ أثناء حفظ البيانات'}), 500
            
    except Exception as e:
        app.logger.error(f'Error in vip_subscribe: {str(e)}')
        return jsonify({'error': 'حدث خطأ غير متوقع'}), 500
        

# Admin VIP Management Routes
@app.route('/admin/vip')
@admin_required  
def admin_vip_dashboard():
    # Statistics
    total_subscriptions = VIPSubscription.query.count()
    pending_subscriptions = VIPSubscription.query.filter_by(payment_status='pending').count()
    active_subscriptions = VIPSubscription.query.filter_by(payment_status='completed', is_active=True).count()
    total_packages = VIPPackage.query.count()
    
    # Recent subscriptions
    recent_subscriptions = VIPSubscription.query.order_by(VIPSubscription.created_at.desc()).limit(10).all()
    
    return render_template('admin/vip_dashboard.html', 
                         total_subscriptions=total_subscriptions,
                         pending_subscriptions=pending_subscriptions,
                         active_subscriptions=active_subscriptions,
                         total_packages=total_packages,
                         recent_subscriptions=recent_subscriptions)

# Merchant Store Routes
@app.route('/merchant/store')
@vip_required
def merchant_store():
    user = User.query.get(session['user_id'])
    
    # Create store if it doesn't exist
    if not user.store:
        store = MerchantStore(
            owner_id=user.id,
            name=f"متجر {user.username}"
        )
        db.session.add(store)
        db.session.commit()
        
    return render_template('merchant/store.html', 
                         store=user.store,
                         store_ads=user.store.ads,
                         is_owner=True)

@app.route('/store/<store_id>')
def view_store(store_id):
    store = MerchantStore.query.get_or_404(store_id)
    is_owner = False
    
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        is_owner = user and user.id == store.owner_id
    
    return render_template('merchant/store.html', 
                         store=store,
                         store_ads=store.ads,
                         is_owner=is_owner)

@app.route('/merchant/store/update', methods=['POST'])
@vip_required
def update_store():
    user = User.query.get(session['user_id'])
    if not user.store:
        return jsonify({'success': False, 'error': 'Store not found'})
    
    data = request.get_json()
    
    if 'name' in data:
        user.store.name = data['name']
    if 'description' in data:
        user.store.description = data['description']
    
    try:
        db.session.commit()
        return jsonify({'success': True})
    except:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Failed to update store'})

@app.route('/merchant/store/banner', methods=['POST'])
@vip_required
def update_store_banner():
    user = User.query.get(session['user_id'])
    if not user.store:
        return jsonify({'success': False, 'error': 'Store not found'})
    
    if 'banner' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded'})
    
    file = request.files['banner']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'})
    
    if file:
        filename = secure_filename(f"store_banner_{user.store.id}_{file.filename}")
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        user.store.banner_url = filename
        
        try:
            db.session.commit()
            return jsonify({'success': True, 'url': filename})
        except:
            db.session.rollback()
            return jsonify({'success': False, 'error': 'Failed to update banner'})

@app.route('/merchant/store/logo', methods=['POST'])
@vip_required
def update_store_logo():
    user = User.query.get(session['user_id'])
    if not user.store:
        return jsonify({'success': False, 'error': 'Store not found'})
    
    if 'logo' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded'})
    
    file = request.files['logo']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'})
    
    if file:
        filename = secure_filename(f"store_logo_{user.store.id}_{file.filename}")
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        user.store.logo_url = filename
        
        try:
            db.session.commit()
            return jsonify({'success': True, 'url': filename})
        except:
            db.session.rollback()
            return jsonify({'success': False, 'error': 'Failed to update logo'})

@app.route('/admin/vip/subscriptions')
@admin_required
def admin_vip_subscriptions():
    page = request.args.get('page', 1, type=int)
    status_filter = request.args.get('payment_status', 'all')
    
    query = VIPSubscription.query
    if status_filter != 'all':
        query = query.filter_by(payment_status=status_filter)
    
    subscriptions = query.order_by(VIPSubscription.created_at.desc()).paginate(
        page=page, per_page=20, error_out=False)
    
    return render_template('admin/vip_subscriptions.html', 
                         subscriptions=subscriptions, 
                         status_filter=status_filter)

@app.route('/admin/vip/subscriptions/<subscription_id>/approve', methods=['POST'])
@admin_required
def approve_vip_subscription(subscription_id):
    subscription = VIPSubscription.query.get_or_404(subscription_id)
    admin_id = session.get('admin_id')
    
    # Update subscription status
    subscription.payment_status = 'completed'
    subscription.is_active = True
    subscription.processed_at = datetime.utcnow()
    subscription.processed_by = admin_id
    subscription.start_date = datetime.utcnow()
    subscription.end_date = datetime.utcnow() + timedelta(days=subscription.package.duration_days)
    
    # Update user VIP status if user exists
    if subscription.user:
        subscription.user.is_vip = True
        
        # Create merchant store if it doesn't exist
        if not subscription.user.store:
            store = MerchantStore(
                owner_id=subscription.user.id,
                name=f"متجر {subscription.user.username}"
            )
            db.session.add(store)
    
    try:
        db.session.commit()
        flash('تم قبول طلب الاشتراك VIP', 'success')
    except:
        db.session.rollback()
        flash('حدث خطأ أثناء قبول الطلب', 'error')
        
    return redirect(url_for('admin_vip_subscriptions'))

@app.route('/admin/vip/subscriptions/<subscription_id>/reject', methods=['POST'])
@admin_required
def reject_vip_subscription(subscription_id):
    subscription = VIPSubscription.query.get_or_404(subscription_id)
    admin_id = session.get('admin_id')
    
    subscription.payment_status = 'failed'
    subscription.processed_at = datetime.utcnow()
    subscription.processed_by = admin_id
    subscription.admin_notes = request.form.get('rejection_reason', '')
    
    db.session.commit()
    flash('تم رفض طلب الاشتراك VIP', 'success')
    return redirect(url_for('admin_vip_subscriptions'))


@app.route('/admin/vip-packages/add', methods=['POST'])
@admin_required
def add_vip_package():
    try:
        # Get form data
        package = VIPPackage(
            id=str(uuid.uuid4()),
            name=request.form.get('name'),
            name_en=request.form.get('name_en'),
            description=request.form.get('description'),
            price=float(request.form.get('price')),
            currency=request.form.get('currency'),
            duration_days=int(request.form.get('duration_days')),
            country_id=request.form.get('country_id'),
            featured_ads_count=int(request.form.get('featured_ads_count', 0)),
            custom_badge=request.form.get('custom_badge'),
            priority_support=bool(request.form.get('priority_support')),
            advanced_analytics=bool(request.form.get('advanced_analytics')),
            boost_in_search=bool(request.form.get('boost_in_search')),
            is_active=True
        )
        
        # Get selected payment methods
        payment_method_ids = request.form.getlist('payment_methods[]')
        if not payment_method_ids:
            raise ValueError('يجب اختيار طريقة دفع واحدة على الأقل')
            
        # Verify payment methods belong to selected country
        payment_methods = PaymentMethod.query.filter(
            PaymentMethod.id.in_(payment_method_ids),
            PaymentMethod.country_id == request.form.get('country_id'),
            PaymentMethod.is_active == True
        ).all()
        
        if len(payment_methods) != len(payment_method_ids):
            raise ValueError('بعض طرق الدفع المختارة غير صالحة')
            
        # Add payment methods to package
        package.payment_methods = payment_methods
        
        db.session.add(package)
        db.session.commit()
        flash('تم إضافة الباقة بنجاح', 'success')
        
    except Exception as e:
        db.session.rollback()
        flash(f'خطأ في إضافة الباقة: {str(e)}', 'error')
    
    return redirect(url_for('admin_vip_packages'))

@app.route('/admin/vip-packages/<package_id>/delete', methods=['POST'])
@admin_required
def delete_vip_package(package_id):
    package = VIPPackage.query.get_or_404(package_id)
    db.session.delete(package)
    db.session.commit()
    flash('تم حذف الباقة', 'success')
    return redirect(url_for('admin_vip_packages'))

# Payment Methods Management Routes
@app.route('/admin/payment-methods')
@admin_required
def admin_payment_methods():
    payment_methods = PaymentMethod.query.all()
    countries = Country.query.filter_by(is_active=True).all()
    return render_template('admin/payment_methods.html', 
                         payment_methods=payment_methods,
                         countries=countries)

@app.route('/admin/payment-methods/add', methods=['POST'])
@admin_required
def admin_payment_method_add():
    try:
        # Get form data
        method = PaymentMethod(
            name=request.form.get('name'),
            name_en=request.form.get('name_en'),
            code=request.form.get('code'),
            icon=request.form.get('icon'),
            country_id=request.form.get('country_id'),
            requires_proof=bool(request.form.get('requires_proof')),
            instructions=request.form.get('instructions'),
            instructions_en=request.form.get('instructions_en'),
            account_name=request.form.get('account_name'),
            account_number=request.form.get('account_number'),
            bank_name=request.form.get('bank_name'),
            iban=request.form.get('iban'),
            is_active=bool(request.form.get('is_active')),
            sort_order=int(request.form.get('sort_order', 0))
        )
        db.session.add(method)
        db.session.commit()
        flash('تم إضافة طريقة الدفع بنجاح', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'حدث خطأ: {str(e)}', 'error')
    
    return redirect(url_for('admin_payment_methods'))

@app.route('/admin/payment-methods/<method_id>/edit', methods=['POST'])
@admin_required
def admin_payment_method_edit(method_id):
    method = PaymentMethod.query.get_or_404(method_id)
    try:
        method.name = request.form.get('name')
        method.name_en = request.form.get('name_en')
        method.code = request.form.get('code')
        method.icon = request.form.get('icon')
        method.country_id = request.form.get('country_id')
        method.requires_proof = bool(request.form.get('requires_proof'))
        method.instructions = request.form.get('instructions')
        method.instructions_en = request.form.get('instructions_en')
        method.account_name = request.form.get('account_name')
        method.account_number = request.form.get('account_number')
        method.bank_name = request.form.get('bank_name')
        method.iban = request.form.get('iban')
        method.is_active = bool(request.form.get('is_active'))
        method.sort_order = int(request.form.get('sort_order', 0))
        
        db.session.commit()
        flash('تم تحديث طريقة الدفع بنجاح', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'حدث خطأ: {str(e)}', 'error')
    
    return redirect(url_for('admin_payment_methods'))

@app.route('/admin/payment-methods/<method_id>/toggle', methods=['POST'])
@admin_required
def admin_payment_method_toggle(method_id):
    method = PaymentMethod.query.get_or_404(method_id)
    method.is_active = not method.is_active
    db.session.commit()
    status = 'تفعيل' if method.is_active else 'تعطيل'
    flash(f'تم {status} طريقة الدفع بنجاح', 'success')
    return redirect(url_for('admin_payment_methods'))

@app.route('/admin/payment-methods/<method_id>/delete', methods=['POST'])
@admin_required
def admin_payment_method_delete(method_id):
    method = PaymentMethod.query.get_or_404(method_id)
    db.session.delete(method)
    db.session.commit()
    flash('تم حذف طريقة الدفع بنجاح', 'success')
    return redirect(url_for('admin_payment_methods'))

@app.route('/api/payment-methods/<method_id>', methods=['GET'])
@admin_required
def get_payment_method(method_id):
    method = PaymentMethod.query.get_or_404(method_id)
    return jsonify({
        'id': method.id,
        'name': method.name,
        'name_en': method.name_en,
        'code': method.code,
        'icon': method.icon,
        'country_id': method.country_id,
        'requires_proof': method.requires_proof,
        'is_active': method.is_active,
        'sort_order': method.sort_order,
        'account_name': method.account_name,
        'bank_name': method.bank_name,
        'account_number': method.account_number,
        'iban': method.iban,
        'swift_code': method.swift_code,
        'instructions': method.instructions,
        'instructions_en': method.instructions_en
    })

@app.route('/api/payment-methods/by-country/<country_id>', methods=['GET'])
@admin_required
def get_payment_methods_by_country(country_id):
    methods = PaymentMethod.query.filter_by(
        country_id=country_id,
        is_active=True
    ).order_by(PaymentMethod.sort_order).all()
    
    return jsonify([{
        'id': method.id,
        'name': method.name,
        'name_en': method.name_en,
        'code': method.code,
        'icon': method.icon,
        'requires_proof': method.requires_proof
    } for method in methods])

# صفحة إدارة المناطق الجغرافية الموحدة
@app.route('/admin/locations', methods=['GET', 'POST'])
@admin_required
def admin_locations():
    countries = Country.query.order_by(Country.name).all()
    selected_country_id = request.args.get('country_id')
    selected_state_id = request.args.get('state_id')
    selected_country = Country.query.get(selected_country_id) if selected_country_id else None
    selected_state = State.query.get(selected_state_id) if selected_state_id else None
    states = State.query.filter_by(country_id=selected_country_id).order_by(State.name).all() if selected_country_id else []
    cities = City.query.filter_by(state_id=selected_state_id).order_by(City.name).all() if selected_state_id else []
    
    # التعامل مع النماذج المختلفة
    if request.method == 'POST':
        form_type = request.form.get('form_type')
        
        try:
            if form_type == 'country':
                # إضافة دولة جديدة
                country = Country(
                    name=request.form.get('name'),
                    name_en=request.form.get('name_en'),
                    code=request.form.get('code'),
                    currency=request.form.get('currency'),
                    vip_price=float(request.form.get('vip_price', 0))
                )
                db.session.add(country)
                flash('تم إضافة الدولة بنجاح', 'success')
                
            elif form_type == 'state' and selected_country:
                # إضافة محافظة جديدة
                state = State(
                    name=request.form.get('name'),
                    name_en=request.form.get('name_en'),
                    country_id=selected_country.id
                )
                db.session.add(state)
                flash('تم إضافة المحافظة بنجاح', 'success')
                
            elif form_type == 'city' and selected_state:
                # إضافة مدينة جديدة
                city = City(
                    name=request.form.get('name'),
                    name_en=request.form.get('name_en'),
                    state_id=selected_state.id
                )
                db.session.add(city)
                flash('تم إضافة المدينة بنجاح', 'success')
            
            db.session.commit()
            
        except Exception as e:
            db.session.rollback()
            flash(f'حدث خطأ: {str(e)}', 'error')
            
        if selected_country:
            return redirect(url_for('admin_locations', country_id=selected_country.id, state_id=selected_state.id if selected_state else None))
        return redirect(url_for('admin_locations'))
            
    return render_template(
        'admin/locations.html',
        countries=countries,
        selected_country=selected_country,
        states=states,
        selected_state=selected_state,
        cities=cities
    )

@app.route('/admin/locations/city/add', methods=['POST'])
@admin_required
def admin_add_city():
    try:
        city = City(
            name=request.form.get('name'),
            name_en=request.form.get('name_en'),
            state_id=request.form.get('state_id')
        )
        db.session.add(city)
        db.session.commit()
        state = State.query.get(request.form.get('state_id'))
        flash('تم إضافة المدينة بنجاح', 'success')
        return redirect(url_for('admin_locations', country_id=state.country_id, state_id=state.id))
    except Exception as e:
        db.session.rollback()
        flash(f'حدث خطأ: {str(e)}', 'error')
        return redirect(url_for('admin_locations'))

@app.route('/api/states/<country_id>')
def get_states(country_id):
    try:
        # Get country and its states in one query
        country = db.session.get(Country, country_id)
        if not country:
            return jsonify({'error': 'الدولة غير موجودة'}), 404
            
        # Get states ordered by name
        states = State.query.filter_by(country_id=country_id).order_by(State.name).all()
        
        return jsonify({
            'states': [{
                'id': state.id,
                'name': state.name,
                'name_en': state.name_en
            } for state in states],
            'country_phone_code': country.phone_code
        })
    except Exception as e:
        app.logger.error(f'Error in get_states: {str(e)}')
        return jsonify({'error': 'حدث خطأ في تحميل المحافظات'}), 500

@app.route('/api/cities/<state_id>')
def get_cities(state_id):
    try:
        # Get state and its cities in one query
        state = db.session.get(State, state_id)
        if not state:
            return jsonify({'error': 'المحافظة غير موجودة'}), 404
            
        # Get cities ordered by name
        cities = City.query.filter_by(state_id=state_id).order_by(City.name).all()
        
        return jsonify([{
            'id': city.id,
            'name': city.name,
            'name_en': city.name_en
        } for city in cities])
    except Exception as e:
        app.logger.error(f'Error in get_cities: {str(e)}')
        return jsonify({'error': 'حدث خطأ في تحميل المدن'}), 500

@app.route('/admin/locations/country/<country_id>/delete', methods=['POST'])
@admin_required
def admin_delete_country(country_id):
    try:
        country = Country.query.get_or_404(country_id)
        db.session.delete(country)
        db.session.commit()
        flash('تم حذف الدولة بنجاح', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'حدث خطأ: {str(e)}', 'error')
    return redirect(url_for('admin_locations'))

@app.route('/admin/locations/state/<state_id>/delete', methods=['POST'])
@admin_required
def admin_delete_state(state_id):
    try:
        state = State.query.get_or_404(state_id)
        country_id = state.country_id
        db.session.delete(state)
        db.session.commit()
        flash('تم حذف المحافظة بنجاح', 'success')
        return redirect(url_for('admin_locations', country_id=country_id))
    except Exception as e:
        db.session.rollback()
        flash(f'حدث خطأ: {str(e)}', 'error')
        return redirect(url_for('admin_locations'))

@app.route('/admin/locations/city/<city_id>/delete', methods=['POST'])
@admin_required
def admin_delete_city(city_id):
    try:
        city = City.query.get_or_404(city_id)
        state = city.state
        db.session.delete(city)
        db.session.commit()
        flash('تم حذف المدينة بنجاح', 'success')
        return redirect(url_for('admin_locations', country_id=state.country_id, state_id=state.id))
    except Exception as e:
        db.session.rollback()
        flash(f'حدث خطأ: {str(e)}', 'error')
        return redirect(url_for('admin_locations'))



if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        
        # Initialize default data
        if not Category.query.first():
            default_categories = [
                {'name': 'عقارات', 'name_en': 'Real Estate', 'icon': 'fas fa-home', 'color': '#3B82F6'},
                {'name': 'سيارات', 'name_en': 'Cars', 'icon': 'fas fa-car', 'color': '#EF4444'},
                {'name': 'وظائف', 'name_en': 'Jobs', 'icon': 'fas fa-briefcase', 'color': '#10B981'},
                {'name': 'إلكترونيات', 'name_en': 'Electronics', 'icon': 'fas fa-laptop', 'color': '#8B5CF6'},
                {'name': 'أثاث', 'name_en': 'Furniture', 'icon': 'fas fa-couch', 'color': '#F59E0B'},
                {'name': 'أزياء', 'name_en': 'Fashion', 'icon': 'fas fa-tshirt', 'color': '#EC4899'}
            ]
            
            for cat_data in default_categories:
                category = Category(**cat_data)
                db.session.add(category)
            
            db.session.commit()
            print("Initialized categories")
        
        # Initialize countries if they don't exist
        if not Country.query.first():
            default_countries = [
                {
                    'name': 'المملكة العربية السعودية', 'name_en': 'Saudi Arabia', 'code': 'SA', 
                    'currency': 'SAR', 'vip_price': 100.00
                },
                {
                    'name': 'الإمارات العربية المتحدة', 'name_en': 'UAE', 'code': 'AE', 
                    'currency': 'AED', 'vip_price': 120.00
                },
                {
                    'name': 'مصر', 'name_en': 'Egypt', 'code': 'EG', 
                    'currency': 'EGP', 'vip_price': 500.00
                }
            ]
            
            for country_data in default_countries:
                country = Country(**country_data)
                db.session.add(country)
            
            db.session.commit()
            print("Initialized countries")
        
        # Create sample AdSense ads if not exists
        if not AdSense.query.first():
            sample_ads = [
                {
                    'name': 'إعلان الرأس الرئيسي',
                    'description': 'إعلان تجريبي في منطقة الرأس',
                    'html_code': '<div style="background: #f0f0f0; padding: 20px; text-align: center; border: 1px solid #ddd;">إعلان تجريبي - الرأس</div>',
                    'ad_type': 'banner',
                    'display_order': 1,
                    'is_active': True
                },
                {
                    'name': 'إعلان المحتوى',
                    'description': 'إعلان تجريبي في منطقة المحتوى',
                    'html_code': '<div style="background: #f0f0f0; padding: 20px; text-align: center; border: 1px solid #ddd;">إعلان تجريبي - المحتوى</div>',
                    'ad_type': 'sidebar',
                    'display_order': 2,
                    'is_active': True
                }
            ]
            
            for ad_data in sample_ads:
                adsense_ad = AdSense(**ad_data)
                db.session.add(adsense_ad)
            
            db.session.commit()
            print("Created sample AdSense ads")
    
    app.run(host='0.0.0.0', port=5000, debug=True)