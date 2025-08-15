from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
from datetime import datetime
import uuid
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://localhost/classified_ads')
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
    password_hash = db.Column(db.String(128), nullable=False)
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
@app.route('/')
def home():
    categories = Category.query.filter_by(is_active=True).all()
    featured_ads = Ad.query.filter_by(is_featured=True, is_approved=True, is_active=True).limit(6).all()
    recent_ads = Ad.query.filter_by(is_approved=True, is_active=True).order_by(Ad.created_at.desc()).limit(12).all()
    
    return render_template('index.html', 
                         categories=categories, 
                         featured_ads=featured_ads, 
                         recent_ads=recent_ads)

@app.route('/category/<category_id>')
def category_ads(category_id):
    category = Category.query.get_or_404(category_id)
    ads = Ad.query.filter_by(category_id=category_id, is_approved=True, is_active=True).order_by(Ad.created_at.desc()).all()
    countries = Country.query.filter_by(is_active=True).all()
    
    return render_template('category.html', category=category, ads=ads, countries=countries)

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
def category_ads(category_id):
    category = Category.query.get_or_404(category_id)
    ads = Ad.query.filter_by(category_id=category_id, is_approved=True, is_active=True).order_by(Ad.created_at.desc()).all()
    countries = Country.query.filter_by(is_active=True).all()
    
    return render_template('category.html', category=category, ads=ads, countries=countries)

@app.route('/become-vip')
def become_vip():
    countries = Country.query.filter_by(is_active=True).all()
    return render_template('become_vip.html', countries=countries)

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
    
    app.run(host='0.0.0.0', port=5000, debug=True)