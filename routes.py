from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session, current_app
from models import db, User, MerchantStore, Ad, Category, Country, VIPPackage
from werkzeug.utils import secure_filename
import os
from functools import wraps
from datetime import datetime, timedelta

# Create Blueprint
bp = Blueprint('merchant', __name__)
def get_site_setting(key, default=None):
    from models import SiteSetting
    setting = SiteSetting.query.filter_by(key=key).first()
    return setting.value if setting else default

def set_site_setting(key, value, description=None):
    from models import SiteSetting
    setting = SiteSetting.query.filter_by(key=key).first()
    if setting:
        setting.value = value
        setting.updated_at = datetime.utcnow()
    else:
        setting = SiteSetting(key=key, value=value, description=description)
        db.session.add(setting)
    db.session.commit()

# Decorators
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

def vip_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login', next=request.url))
        
        user = User.query.get(session['user_id'])
        if not user or not user.is_vip:
            flash('هذه الميزة متاحة فقط للأعضاء VIP', 'error')
            return redirect(url_for('become_vip'))
            
        return f(*args, **kwargs)
    return decorated_function

# VIP Package routes
@bp.route('/api/vip-packages/<country_code>')
def get_country_packages(country_code):
    try:
        # Get country object by code
        country = Country.query.filter_by(code=country_code).first_or_404()
        
        # Get packages for this country
        packages = db.session.query(VIPPackage).filter(
            VIPPackage.country_id == country.id,
            VIPPackage.is_active == True
        ).order_by(VIPPackage.price).all()
        
        # Format packages
        packages_data = [{
            'id': pkg.id,
            'name': pkg.name,
            'description': pkg.description,
            'price': pkg.price,
            'currency': country.currency_code,
            'duration_days': pkg.duration_days,
            'featured_ads_count': pkg.featured_ads_count,
            'priority_support': pkg.priority_support,
            'advanced_analytics': pkg.advanced_analytics,
            'boost_in_search': pkg.boost_in_search,
            'custom_badge': pkg.custom_badge
        } for pkg in packages]
        
        return jsonify({
            'status': 'success',
            'packages': packages_data
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# Routes
@bp.route('/store')
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

@bp.route('/view/<store_id>')
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

@bp.route('/store/update', methods=['POST'])
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

@bp.route('/store/banner', methods=['POST'])
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
        file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], filename))
        user.store.banner_url = filename
        
        try:
            db.session.commit()
            return jsonify({'success': True, 'url': filename})
        except:
            db.session.rollback()
            return jsonify({'success': False, 'error': 'Failed to update banner'})

@bp.route('/store/logo', methods=['POST'])
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
        file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], filename))
        user.store.logo_url = filename
        
        try:
            db.session.commit()
            return jsonify({'success': True, 'url': filename})
        except:
            db.session.rollback()
            return jsonify({'success': False, 'error': 'Failed to update logo'})

@bp.route('/store/ad/add')
@vip_required
def add_store_ad():
    user = User.query.get(session['user_id'])
    if not user.store:
        flash('يجب إنشاء متجر أولاً', 'error')
        return redirect(url_for('merchant.merchant_store'))
    
    return render_template('merchant/add_ad.html',
                         countries=Country.query.filter_by(is_active=True).all(),
                         categories=Category.query.filter_by(is_active=True).all())

# Context processor to add current user to all templates
@bp.context_processor
def inject_user():
    if 'user_id' in session:
        return {'current_user': User.query.get(session['user_id'])}
    return {'current_user': None}
