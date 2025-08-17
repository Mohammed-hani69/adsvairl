from datetime import datetime
import uuid
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

db = SQLAlchemy()

class User(db.Model, UserMixin):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    phone = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)
    is_vip = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    # VIP Merchant Store
    store = db.relationship('MerchantStore', backref='owner', uselist=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
        
    def get_id(self):
        return str(self.id)

class MerchantStore(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    logo_url = db.Column(db.String(255))
    banner_url = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Store ads
    ads = db.relationship('Ad', backref='store', lazy=True)

class SiteSetting(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key = db.Column(db.String(50), unique=True, nullable=False)
    value = db.Column(db.String(255))
    description = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PaymentMethod(db.Model):
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

class Ad(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='SAR')
    images = db.Column(db.JSON, default=list)
    
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    category_id = db.Column(db.String(36), db.ForeignKey('category.id'), nullable=False)
    country_id = db.Column(db.String(36), db.ForeignKey('country.id'), nullable=False)
    state_id = db.Column(db.String(36), db.ForeignKey('state.id'))
    city_id = db.Column(db.String(36), db.ForeignKey('city.id'))
    store_id = db.Column(db.String(36), db.ForeignKey('merchant_store.id'))
    
    contact_phone = db.Column(db.String(20))  # Making phone optional
    contact_email = db.Column(db.String(120))
    
    is_featured = db.Column(db.Boolean, default=False)
    is_approved = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)
    
    views_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref='ads')
    category = db.relationship('Category', backref='ads')
    country = db.relationship('Country', backref='ads')
    state = db.relationship('State', backref='ads')
    city = db.relationship('City', backref='ads')

class Category(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100))
    description = db.Column(db.Text)
    slug = db.Column(db.String(50), unique=True)
    parent_id = db.Column(db.String(36), db.ForeignKey('category.id'))
    icon = db.Column(db.String(50))
    color = db.Column(db.String(7))
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Self-referential relationship for subcategories
    children = db.relationship('Category', backref=db.backref('parent', remote_side=[id]))

class Country(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100))
    code = db.Column(db.String(2), unique=True)
    phone_code = db.Column(db.String(5))
    currency = db.Column(db.String(3))
    flag = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    states = db.relationship('State', backref='country', lazy=True)

class State(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100))
    country_id = db.Column(db.String(36), db.ForeignKey('country.id'), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    cities = db.relationship('City', backref='state', lazy=True)

class City(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100))
    state_id = db.Column(db.String(36), db.ForeignKey('state.id'), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

vip_package_payment_methods = db.Table('vip_package_payment_methods',
    db.Column('package_id', db.String(36), db.ForeignKey('vip_package.id'), primary_key=True),
    db.Column('payment_method_id', db.String(36), db.ForeignKey('payment_method.id'), primary_key=True)
)

class VIPPackage(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100))
    description = db.Column(db.Text)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='SAR')
    duration_days = db.Column(db.Integer, nullable=False)
    country_id = db.Column(db.String(36), db.ForeignKey('country.id'), nullable=False)
    featured_ads_count = db.Column(db.Integer, default=0)
    custom_badge = db.Column(db.String(50))
    priority_support = db.Column(db.Boolean, default=False)
    advanced_analytics = db.Column(db.Boolean, default=False)
    boost_in_search = db.Column(db.Boolean, default=False)
    features = db.Column(db.JSON, default=list)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    country = db.relationship('Country', backref='vip_packages')
    payment_methods = db.relationship('PaymentMethod', secondary=vip_package_payment_methods, 
                                    backref=db.backref('vip_packages', lazy='dynamic'))

class VIPSubscription(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    package_id = db.Column(db.String(36), db.ForeignKey('vip_package.id'), nullable=False)
    start_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    end_date = db.Column(db.DateTime, nullable=False)
    payment_status = db.Column(db.String(20), default='pending')  # pending, completed, failed
    payment_method = db.Column(db.String(50))
    payment_details = db.Column(db.JSON)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref='subscriptions')
    package = db.relationship('VIPPackage', backref='subscriptions')

class AdSense(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    ad_type = db.Column(db.String(20), nullable=False)  # banner, sidebar, popup
    html_code = db.Column(db.Text, nullable=False)
    display_order = db.Column(db.Integer, default=0)
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Category model moved to top of file

# Country model moved to top of file

# State and City models moved to top of file
