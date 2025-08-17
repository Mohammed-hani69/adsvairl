#!/usr/bin/env python3
import os
from datetime import datetime
from werkzeug.security import generate_password_hash
from app import app
from models import db, User, Category, Country, State, City, VIPPackage, VIPSubscription, MerchantStore, SiteSetting

def init_database():
    """Initialize database with tables and sample data"""
    print("Creating database tables...")
    
    with app.app_context():
        # Drop all tables and recreate them
        db.drop_all()
        db.create_all()
        
        # Initialize site settings
        site_settings = [
            {
                'key': 'show_vip_section',
                'value': 'true',
                'description': 'Controls visibility of VIP section on homepage'
            }
        ]
        
        for setting in site_settings:
            db_setting = SiteSetting(
                key=setting['key'],
                value=setting['value'],
                description=setting['description']
            )
            db.session.add(db_setting)
        
        # Create admin user
        admin_user = User(
            id='admin-user-001',
            username='admin',
            email='hanizezo5@gmail.com',
            password_hash=generate_password_hash('zxc65432'),
            phone='+201234567890',
            is_admin=True,
            is_vip=True
        )
        db.session.add(admin_user)
        
        # Create admin store
        admin_store = MerchantStore(
            owner_id=admin_user.id,
            name="متجر المشرف",
            description="المتجر الرسمي للموقع"
        )
        db.session.add(admin_store)
        
        # Create default user
        default_user = User(
            id='default-user',
            username='user',
            email='user@example.com',
            password_hash=generate_password_hash('password123'),
            phone='+201234567891',
            is_admin=False,
            is_vip=False
        )
        db.session.add(default_user)
        
        # Create categories
        categories = [
            {
                'id': 'cat-real-estate',
                'name': 'عقارات',
                'name_en': 'Real Estate',
                'icon': 'fas fa-home',
                'color': '#3b82f6'
            },
            {
                'id': 'cat-cars',
                'name': 'سيارات',
                'name_en': 'Cars',
                'icon': 'fas fa-car',
                'color': '#ef4444'
            },
            {
                'id': 'cat-electronics',
                'name': 'إلكترونيات',
                'name_en': 'Electronics',
                'icon': 'fas fa-laptop',
                'color': '#8b5cf6'
            },
            {
                'id': 'cat-furniture',
                'name': 'أثاث',
                'name_en': 'Furniture',
                'icon': 'fas fa-couch',
                'color': '#f59e0b'
            },
            {
                'id': 'cat-jobs',
                'name': 'وظائف',
                'name_en': 'Jobs',
                'icon': 'fas fa-briefcase',
                'color': '#10b981'
            },
            {
                'id': 'cat-services',
                'name': 'خدمات',
                'name_en': 'Services',
                'icon': 'fas fa-tools',
                'color': '#6366f1'
            }
        ]
        
        for cat_data in categories:
            category = Category(
                id=cat_data['id'],
                name=cat_data['name'],
                name_en=cat_data['name_en'],
                icon=cat_data['icon'],
                color=cat_data['color']
            )
            db.session.add(category)
        
        # Create countries
        countries = [
            {'id': 'country-egypt', 'name': 'مصر', 'name_en': 'Egypt', 'code': 'EG', 'currency': 'EGP', 'phone_code': '+20', 'flag': 'eg.png'},
            {'id': 'country-saudi', 'name': 'السعودية', 'name_en': 'Saudi Arabia', 'code': 'SA', 'currency': 'SAR', 'phone_code': '+966', 'flag': 'sa.png'},
            {'id': 'country-uae', 'name': 'الإمارات', 'name_en': 'UAE', 'code': 'AE', 'currency': 'AED', 'phone_code': '+971', 'flag': 'ae.png'},
            {'id': 'country-kuwait', 'name': 'الكويت', 'name_en': 'Kuwait', 'code': 'KW', 'currency': 'KWD', 'phone_code': '+965', 'flag': 'kw.png'},
            {'id': 'country-qatar', 'name': 'قطر', 'name_en': 'Qatar', 'code': 'QA', 'currency': 'QAR', 'phone_code': '+974', 'flag': 'qa.png'}
        ]
        
        for country_data in countries:
            country = Country(
                id=country_data['id'],
                name=country_data['name'],
                name_en=country_data['name_en'],
                code=country_data['code'],
                currency=country_data['currency'],
                phone_code=country_data['phone_code'],
                flag=country_data['flag'],
                is_active=True
            )
            db.session.add(country)
        
        # Create states for Egypt
        egypt_states = [
            {'id': 'state-cairo', 'name': 'القاهرة', 'name_en': 'Cairo', 'country_id': 'country-egypt'},
            {'id': 'state-giza', 'name': 'الجيزة', 'name_en': 'Giza', 'country_id': 'country-egypt'},
            {'id': 'state-alex', 'name': 'الإسكندرية', 'name_en': 'Alexandria', 'country_id': 'country-egypt'},
            {'id': 'state-sharm', 'name': 'شرم الشيخ', 'name_en': 'Sharm El Sheikh', 'country_id': 'country-egypt'}
        ]
        
        for state_data in egypt_states:
            state = State(
                id=state_data['id'],
                name=state_data['name'],
                name_en=state_data['name_en'],
                country_id=state_data['country_id']
            )
            db.session.add(state)
        
        # Create cities for Cairo
        cairo_cities = [
            {'id': 'city-nasr', 'name': 'مدينة نصر', 'name_en': 'Nasr City', 'state_id': 'state-cairo'},
            {'id': 'city-heliopolis', 'name': 'مصر الجديدة', 'name_en': 'Heliopolis', 'state_id': 'state-cairo'},
            {'id': 'city-maadi', 'name': 'المعادي', 'name_en': 'Maadi', 'state_id': 'state-cairo'},
            {'id': 'city-zamalek', 'name': 'الزمالك', 'name_en': 'Zamalek', 'state_id': 'state-cairo'}
        ]
        
        for city_data in cairo_cities:
            city = City(
                id=city_data['id'],
                name=city_data['name'],
                name_en=city_data['name_en'],
                state_id=city_data['state_id']
            )
            db.session.add(city)
        
        # Add VIP packages for UAE
        print("Adding VIP packages...")
        uae = Country.query.filter_by(name='الإمارات العربية المتحدة').first()
        if uae:
            # Basic VIP Package
            basic_package = VIPPackage(
                name='VIP أساسي',
                name_en='Basic VIP',
                description='باقة VIP أساسية مع مميزات محدودة',
                price=99.0,
                currency='AED',
                duration_days=30,
                country_id=uae.id,
                featured_ads_count=10,
                priority_support=False,
                advanced_analytics=False,
                boost_in_search=False,
                features={
                    'max_ads': 10,
                    'featured_ads': True,
                    'priority_support': False
                },
                is_active=True
            )
            db.session.add(basic_package)
            
            # Premium VIP Package
            premium_package = VIPPackage(
                name='VIP بريميوم',
                name_en='Premium VIP',
                description='باقة VIP متقدمة مع جميع المميزات',
                price=199.0,
                currency='AED',
                duration_days=30,
                country_id=uae.id,
                featured_ads_count=50,
                priority_support=True,
                advanced_analytics=True,
                boost_in_search=True,
                features={
                    'max_ads': 50,
                    'featured_ads': True,
                    'priority_support': True,
                    'boost_in_search': True,
                    'analytics': True
                },
                is_active=True
            )
            db.session.add(premium_package)
            
            # Payment methods are now handled via the payment_details JSON field in VIPSubscription
            
        # Add VIP packages for Saudi Arabia
        saudi = Country.query.filter_by(name='المملكة العربية السعودية').first()
        if saudi:
            # Basic VIP Package for Saudi
            basic_package_sa = VIPPackage(
                name='VIP أساسي',
                description='باقة VIP أساسية للمملكة العربية السعودية',
                price=120.0,
                duration_days=30,
                features={
                    'max_ads': 10,
                    'featured_ads': True,
                    'priority_support': False
                },
                is_active=True
            )
            db.session.add(basic_package_sa)
        
        # Commit all data
        db.session.commit()
        
        print("✓ Database initialized successfully!")
        print("✓ Admin user created: hanizezo5@gmail.com / zxc65432")
        print("✓ Sample categories, countries, states, and cities added")
        print("✓ VIP packages and payment methods added")

if __name__ == '__main__':
    init_database()