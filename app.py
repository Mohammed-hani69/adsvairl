from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from functools import wraps
import os
from datetime import datetime
import uuid
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
database_url = os.environ.get('DATABASE_URL')
if database_url and database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = database_url or 'postgresql://localhost/classified_ads'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

db = SQLAlchemy(app)

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Database Models
class User(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20))
    is_admin = db.Column(db.Boolean, default=False)
    is_vip = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    ads = db.relationship('Ad', backref='user', lazy=True)

class Country(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(3), unique=True, nullable=False)
    currency = db.Column(db.String(3), nullable=False)
    vip_price = db.Column(db.Numeric(10, 2), nullable=False)
    payment_methods = db.Column(db.JSON, default=list)
    requires_transfer_proof = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    states = db.relationship('State', backref='country', lazy=True)

class State(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100))
    country_id = db.Column(db.String(36), db.ForeignKey('country.id'), nullable=False)
    
    cities = db.relationship('City', backref='state', lazy=True)

class City(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100))
    state_id = db.Column(db.String(36), db.ForeignKey('state.id'), nullable=False)

class Category(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100), nullable=False)
    icon = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(7), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    ads = db.relationship('Ad', backref='category', lazy=True)

class AdSenseAd(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)  # Display name for admin
    ad_unit_id = db.Column(db.String(200), nullable=False)  # AdSense ad unit ID
    ad_code = db.Column(db.Text, nullable=False)  # Full AdSense code
    placement = db.Column(db.String(50), nullable=False)  # header, sidebar, footer, content, etc.
    page_location = db.Column(db.String(50), nullable=False)  # home, category, ad_details, all
    is_active = db.Column(db.Boolean, default=True)
    width = db.Column(db.Integer)  # Ad width
    height = db.Column(db.Integer)  # Ad height
    responsive = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Ad(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='USD')
    
    category_id = db.Column(db.String(36), db.ForeignKey('category.id'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    country_id = db.Column(db.String(36), db.ForeignKey('country.id'), nullable=False)
    state_id = db.Column(db.String(36), db.ForeignKey('state.id'))
    city_id = db.Column(db.String(36), db.ForeignKey('city.id'))
    
    contact_phone = db.Column(db.String(20), nullable=False)
    contact_email = db.Column(db.String(120))
    
    images = db.Column(db.JSON, default=list)
    is_featured = db.Column(db.Boolean, default=False)
    is_approved = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)
    
    views_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Routes
def get_adsense_ads(page_location, placement=None):
    """Helper function to get AdSense ads for a specific page and placement"""
    query = AdSenseAd.query.filter_by(is_active=True)
    query = query.filter((AdSenseAd.page_location == page_location) | (AdSenseAd.page_location == 'all'))
    if placement:
        query = query.filter_by(placement=placement)
    return query.all()

@app.route('/')
def home():
    categories = Category.query.filter_by(is_active=True).all()
    featured_ads = Ad.query.filter_by(is_featured=True, is_approved=True, is_active=True).limit(6).all()
    recent_ads = Ad.query.filter_by(is_approved=True, is_active=True).order_by(Ad.created_at.desc()).limit(12).all()
    
    # Get AdSense ads for home page
    adsense_ads = {
        'header': get_adsense_ads('home', 'header'),
        'sidebar': get_adsense_ads('home', 'sidebar'),
        'content': get_adsense_ads('home', 'content'),
        'footer': get_adsense_ads('home', 'footer')
    }
    
    return render_template('index.html', 
                         categories=categories, 
                         featured_ads=featured_ads, 
                         recent_ads=recent_ads,
                         adsense_ads=adsense_ads)



@app.route('/ad/<ad_id>')
def ad_details(ad_id):
    ad = Ad.query.get_or_404(ad_id)
    
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

@app.route('/api/states/<country_id>')
def get_states(country_id):
    states = State.query.filter_by(country_id=country_id).all()
    return jsonify([{'id': s.id, 'name': s.name} for s in states])

@app.route('/api/cities/<state_id>')
def get_cities(state_id):
    cities = City.query.filter_by(state_id=state_id).all()
    return jsonify([{'id': c.id, 'name': c.name} for c in cities])

@app.route('/api/ads', methods=['POST'])
def create_ad():
    try:
        # Handle file uploads
        uploaded_files = request.files.getlist('images')
        image_paths = []
        
        for file in uploaded_files:
            if file and file.filename != '':
                filename = secure_filename(file.filename)
                # Add timestamp to avoid conflicts
                filename = f"{int(datetime.now().timestamp())}_{filename}"
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                image_paths.append(filename)
        
        # Create new ad
        ad = Ad(
            title=request.form.get('title'),
            description=request.form.get('description'),
            price=float(request.form.get('price')),
            currency=request.form.get('currency', 'USD'),
            category_id=request.form.get('category_id'),
            user_id='default-user',  # Temporary until auth is implemented
            country_id=request.form.get('country_id'),
            state_id=request.form.get('state_id') or None,
            city_id=request.form.get('city_id') or None,
            contact_phone=request.form.get('contact_phone'),
            contact_email=request.form.get('contact_email') or None,
            images=image_paths
        )
        
        db.session.add(ad)
        db.session.commit()
        
        return jsonify({'success': True, 'ad_id': ad.id})
        
    except Exception as e:
        print(f"Error creating ad: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/category/<category_id>')
def category_view(category_id):
    category = Category.query.get_or_404(category_id)
    ads = Ad.query.filter_by(category_id=category_id, is_approved=True, is_active=True).order_by(Ad.created_at.desc()).all()
    countries = Country.query.filter_by(is_active=True).all()
    
    return render_template('category.html', category=category, ads=ads, countries=countries)

@app.route('/become-vip')
def become_vip():
    countries = Country.query.filter_by(is_active=True).all()
    return render_template('become_vip.html', countries=countries)

# Admin authentication decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_id' not in session:
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

# Admin routes
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        admin = User.query.filter_by(email=email, is_admin=True).first()
        
        if admin and check_password_hash(admin.password_hash, password):
            session['admin_id'] = admin.id
            flash('تم تسجيل الدخول بنجاح', 'success')
            return redirect(url_for('admin_dashboard'))
        else:
            flash('بيانات الدخول غير صحيحة', 'error')
    
    return render_template('admin/login.html')

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_id', None)
    flash('تم تسجيل الخروج بنجاح', 'success')
    return redirect(url_for('admin_login'))

@app.route('/admin')
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
@app.route('/admin/adsense')
@admin_required
def admin_adsense():
    adsense_ads = AdSenseAd.query.order_by(AdSenseAd.created_at.desc()).all()
    return render_template('admin/adsense.html', adsense_ads=adsense_ads)

@app.route('/admin/adsense/add', methods=['GET', 'POST'])
@admin_required
def admin_adsense_add():
    if request.method == 'POST':
        try:
            adsense_ad = AdSenseAd(
                name=request.form.get('name'),
                ad_unit_id=request.form.get('ad_unit_id'),
                ad_code=request.form.get('ad_code'),
                placement=request.form.get('placement'),
                page_location=request.form.get('page_location'),
                width=int(request.form.get('width', 0)) if request.form.get('width') else None,
                height=int(request.form.get('height', 0)) if request.form.get('height') else None,
                responsive=request.form.get('responsive') == 'on',
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
    adsense_ad = AdSenseAd.query.get_or_404(ad_id)
    
    if request.method == 'POST':
        try:
            adsense_ad.name = request.form.get('name')
            adsense_ad.ad_unit_id = request.form.get('ad_unit_id')
            adsense_ad.ad_code = request.form.get('ad_code')
            adsense_ad.placement = request.form.get('placement')
            adsense_ad.page_location = request.form.get('page_location')
            adsense_ad.width = int(request.form.get('width', 0)) if request.form.get('width') else None
            adsense_ad.height = int(request.form.get('height', 0)) if request.form.get('height') else None
            adsense_ad.responsive = request.form.get('responsive') == 'on'
            adsense_ad.is_active = request.form.get('is_active') == 'on'
            adsense_ad.updated_at = datetime.utcnow()
            
            db.session.commit()
            flash('تم تحديث إعلان AdSense بنجاح', 'success')
            return redirect(url_for('admin_adsense'))
            
        except Exception as e:
            flash(f'حدث خطأ: {str(e)}', 'error')
    
    return render_template('admin/adsense_form.html', ad=adsense_ad)

@app.route('/admin/adsense/<ad_id>/toggle', methods=['POST'])
@admin_required
def admin_adsense_toggle(ad_id):
    adsense_ad = AdSenseAd.query.get_or_404(ad_id)
    adsense_ad.is_active = not adsense_ad.is_active
    adsense_ad.updated_at = datetime.utcnow()
    db.session.commit()
    
    status = 'تم تفعيل' if adsense_ad.is_active else 'تم إلغاء تفعيل'
    flash(f'{status} إعلان AdSense', 'success')
    return redirect(url_for('admin_adsense'))

@app.route('/admin/adsense/<ad_id>/delete', methods=['POST'])
@admin_required
def admin_adsense_delete(ad_id):
    adsense_ad = AdSenseAd.query.get_or_404(ad_id)
    db.session.delete(adsense_ad)
    db.session.commit()
    flash('تم حذف إعلان AdSense', 'success')
    return redirect(url_for('admin_adsense'))

@app.route('/search')
def search():
    query = request.args.get('q', '')
    category_id = request.args.get('category')
    
    ads_query = Ad.query.filter_by(is_approved=True, is_active=True)
    
    if query:
        ads_query = ads_query.filter(
            Ad.title.contains(query) | Ad.description.contains(query)
        )
    
    if category_id:
        ads_query = ads_query.filter_by(category_id=category_id)
    
    ads = ads_query.order_by(Ad.created_at.desc()).all()
    categories = Category.query.filter_by(is_active=True).all()
    
    return render_template('search.html', ads=ads, categories=categories, 
                         query=query, selected_category=category_id)

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
                    'name': 'السعودية', 'name_en': 'Saudi Arabia', 'code': 'SA', 
                    'currency': 'SAR', 'vip_price': 100.00,
                    'payment_methods': ['bank_transfer', 'stripe']
                },
                {
                    'name': 'الإمارات', 'name_en': 'UAE', 'code': 'AE', 
                    'currency': 'AED', 'vip_price': 120.00,
                    'payment_methods': ['bank_transfer', 'stripe']
                },
                {
                    'name': 'مصر', 'name_en': 'Egypt', 'code': 'EG', 
                    'currency': 'EGP', 'vip_price': 500.00,
                    'payment_methods': ['bank_transfer']
                }
            ]
            
            for country_data in default_countries:
                country = Country(**country_data)
                db.session.add(country)
            
            db.session.commit()
            print("Initialized countries")
        
        # Create default user if doesn't exist
        if not User.query.filter_by(username='default').first():
            user = User(
                id='default-user',
                username='default',
                email='default@example.com',
                password_hash=generate_password_hash('password')
            )
            db.session.add(user)
            db.session.commit()
            print("Created default user")
        
        # Create admin user
        if not User.query.filter_by(email='hanizezo5@gmail.com').first():
            admin = User(
                username='admin',
                email='hanizezo5@gmail.com',
                password_hash=generate_password_hash('zxc65432'),
                is_admin=True
            )
            db.session.add(admin)
            db.session.commit()
            print("Created admin user")
        
        # Create sample AdSense ads if not exists
        if not AdSenseAd.query.first():
            sample_ads = [
                {
                    'name': 'إعلان الرأس الرئيسي',
                    'ad_unit_id': 'ca-pub-1234567890123456/1234567890',
                    'ad_code': '<div style="background: #f0f0f0; padding: 20px; text-align: center; border: 1px solid #ddd;">إعلان تجريبي - الرأس</div>',
                    'placement': 'header',
                    'page_location': 'home',
                    'width': 728,
                    'height': 90,
                    'responsive': True,
                    'is_active': True
                },
                {
                    'name': 'إعلان المحتوى',
                    'ad_unit_id': 'ca-pub-1234567890123456/0987654321',
                    'ad_code': '<div style="background: #f0f0f0; padding: 20px; text-align: center; border: 1px solid #ddd;">إعلان تجريبي - المحتوى</div>',
                    'placement': 'content',
                    'page_location': 'all',
                    'width': 336,
                    'height': 280,
                    'responsive': True,
                    'is_active': True
                }
            ]
            
            for ad_data in sample_ads:
                adsense_ad = AdSenseAd(**ad_data)
                db.session.add(adsense_ad)
            
            db.session.commit()
            print("Created sample AdSense ads")
    
    app.run(host='0.0.0.0', port=5000, debug=True)