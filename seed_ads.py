from app import app, db
from models import Ad, Category, User, Country, State, City
from datetime import datetime
import random

def create_sample_ads():
    with app.app_context():
        # تأكد من وجود مستخدم على الأقل
        user = User.query.first()
        if not user:
            print("يجب أن يكون هناك مستخدم واحد على الأقل في قاعدة البيانات")
            return

        # الحصول على الفئات والمدن والدول
        categories = Category.query.all()
        countries = Country.query.all()
        states = State.query.all()
        cities = City.query.all()

        # تصنيف الصور حسب الفئات
        category_images = {
            'سيارات': [
                'Land-Rover-Range-Rover-Vogue-V8-2023_2481_242304905-1_small.webp',
                'mercedes-benz-g-class-project-gelandewagen.jpg',
                'تويوتا كامري - سيارة سيدان كبيرة واقتصادية_0.jpg.webp',
                'هيونداي-إلنترا-2025.jpg'
            ],
            'عقارات': [
                'شقة-فندقية-للبيع-على-النيل-في-برج-ريف-دو-نيل.jpg'
            ],
            'إلكترونيات': [
                'apple_iphone_13_mini_azul_02_ad_l.jpg',
                'iphone16-pro-desert.webp',
                'iphone_16_pink_1.jpg',
                'Dell-Inspiron-14-plus-7441-1-1024x715.jpg',
                'Surface-Laptop-7th-Edition-1.jpg',
                'apple-macbook-air-silver-mqd32_1.webp',
                'MbApple181.webp'
            ],
            'أثاث': [
                'China-Wholesale-Home-Living-Room-Furniture-TV-Mounts-Wood-TV-Cabinet-Grey-White-Wooden-Long-TV-Stand.avif',
                '7722069-92ed0o.jpg',
                '7725642-da6b0o.webp',
                '7735739-f8e93o.jpg'
            ],
            'أخرى': [
                '140161059-400x300.jpg',
                '1645018982170856176.jpg',
                '18031410845564202507011115411541.jpg',
                '2019_9_15_16_6_18_737.jpg',
                '2469243_0.jpg',
                '42f3456e-207e-44a0-b289-17b66841b13f.webp'
            ]
        }

        # قواميس العناوين والأوصاف حسب الصور
        image_details = {
            # سيارات
            'Land-Rover-Range-Rover-Vogue-V8-2023_2481_242304905-1_small.webp': {
                'title': 'رنج روفر فوج V8 موديل 2023 فل كامل',
                'description': 'رنج روفر فوج V8 موديل 2023، فل كامل المواصفات، بحالة الوكالة، ضمان وصيانة، كيلومترات قليلة، لون مميز، فرش جلد فاخر، شاشات خلفية، رادار، كاميرات 360 درجة.'
            },
            'mercedes-benz-g-class-project-gelandewagen.jpg': {
                'title': 'مرسيدس G-Class جيلاندفاجن 2023',
                'description': 'مرسيدس G-Class جيلاندفاجن، إصدار خاص، أعلى فئة، جميع الإضافات، نظام صوت بورميستر، فتحة سقف، جنوط AMG، حالة ممتازة.'
            },
            'تويوتا كامري - سيارة سيدان كبيرة واقتصادية_0.jpg.webp': {
                'title': 'تويوتا كامري 2025 فل كامل هايبرد',
                'description': 'تويوتا كامري 2025 هايبرد، اقتصادية في استهلاك الوقود، مواصفات كاملة، شاشة كبيرة، تحكم عن بعد، كاميرا خلفية، حساسات، ضمان الوكيل.'
            },
            'هيونداي-إلنترا-2025.jpg': {
                'title': 'هيونداي إلنترا 2025 الشكل الجديد',
                'description': 'هيونداي إلنترا 2025 الشكل الجديد كلياً، محرك توربو، بصمة، تشغيل عن بعد، مثبت سرعة، شاشة لمس، أندرويد اوتو، حالة الوكالة.'
            },

            # عقارات
            'شقة-فندقية-للبيع-على-النيل-في-برج-ريف-دو-نيل.jpg': {
                'title': 'شقة فندقية فاخرة للبيع على النيل مباشرة',
                'description': 'شقة فندقية فاخرة في برج ريف دو نيل، إطلالة مباشرة على النيل، 3 غرف نوم، صالة كبيرة، 3 حمامات، مطبخ أمريكي، تشطيب سوبر لوكس، خدمات فندقية متكاملة.'
            },

            # إلكترونيات
            'apple_iphone_13_mini_azul_02_ad_l.jpg': {
                'title': 'ايفون 13 ميني أزرق - ذاكرة 256 جيجا',
                'description': 'ايفون 13 ميني لون أزرق، ذاكرة 256 جيجا، جديد بالكرتونة، ضمان سنة، شاشة سوبر ريتينا، كاميرا مزدوجة، بطارية تدوم طويلاً.'
            },
            'iphone16-pro-desert.webp': {
                'title': 'ايفون 16 برو ماكس - إصدار صحراوي خاص',
                'description': 'ايفون 16 برو ماكس الإصدار الصحراوي الخاص، ذاكرة 512 جيجا، تيتانيوم، كاميرا احترافية، معالج A18 Pro، شاشة 6.7 بوصة.'
            },
            'Dell-Inspiron-14-plus-7441-1-1024x715.jpg': {
                'title': 'لابتوب ديل انسبايرون 14 بلس للألعاب',
                'description': 'لابتوب ديل انسبايرون 14 بلس، معالج Core i7 جيل 13، كرت شاشة RTX 4060، رام 32 جيجا، SSD 1 تيرا، شاشة QHD، ضمان سنة.'
            },
            'Surface-Laptop-7th-Edition-1.jpg': {
                'title': 'مايكروسوفت سيرفس لابتوب 7',
                'description': 'سيرفس لابتوب 7 الجيل الجديد، شاشة لمس PixelSense، معالج Intel Core i5، ذاكرة 16GB، تخزين 512GB SSD، بطارية تدوم 19 ساعة.'
            },
            'apple-macbook-air-silver-mqd32_1.webp': {
                'title': 'ماك بوك اير M2 فضي',
                'description': 'ماك بوك اير M2، شريحة ابل M2، ذاكرة 16 جيجا، تخزين 512 جيجا SSD، شاشة Liquid Retina، لون فضي، يدعم الشحن السريع.'
            },

            # أثاث
            'China-Wholesale-Home-Living-Room-Furniture-TV-Mounts-Wood-TV-Cabinet-Grey-White-Wooden-Long-TV-Stand.avif': {
                'title': 'طاولة تلفاز خشبية فاخرة مودرن',
                'description': 'طاولة تلفاز خشبية بتصميم عصري، لون رمادي وأبيض، خشب زان عالي الجودة، أدراج متعددة، حامل تلفاز مدمج، مساحة تخزين كبيرة.'
            },
            '7722069-92ed0o.jpg': {
                'title': 'غرفة نوم كاملة تركي',
                'description': 'غرفة نوم كاملة صناعة تركية، خشب زان أصلي، دولاب 6 درف، سرير كينج، 2 كومودينو، تسريحة كبيرة، تصميم راقي.'
            },
            '7725642-da6b0o.webp': {
                'title': 'طقم كنب مودرن فخم',
                'description': 'طقم كنب مودرن 7 مقاعد، قماش مستورد ضد البقع، إسفنج عالي الكثافة، هيكل خشبي متين، ضمان 5 سنوات.'
            }
        }

        # عناوين وأوصاف للصور الأخرى
        default_details = {
            'title': [
                "أثاث منزلي فاخر",
                "إكسسوارات منزلية",
                "أدوات مطبخ حديثة",
                "أجهزة منزلية",
                "مستلزمات ديكور"
            ],
            'description': [
                "منتج عالي الجودة، حالة ممتازة، استخدام نظيف",
                "جديد بالكرتون مع الضمان، استيراد أصلي",
                "استعمال خفيف، السعر قابل للتفاوض، توصيل مجاني",
                "الحالة كالجديد، مع كامل الملحقات والضمان",
                "تم الشراء حديثاً، مع فاتورة الضمان"
            ]
        }

        # عناوين وأوصاف افتراضية للإعلانات
        ad_titles = [
            "منتج مميز للبيع",
            "عرض خاص لفترة محدودة",
            "فرصة لا تعوض",
            "أفضل سعر في السوق",
            "جودة عالية وضمان"
        ]
        descriptions = [
            "حالة ممتازة، استخدام نظيف، السعر قابل للتفاوض",
            "جديد بالكرتون مع الضمان، استيراد أصلي",
            "استعمال خفيف، مع كامل الملحقات",
            "الحالة كالجديد، مع فاتورة الضمان",
            "توصيل مجاني لجميع المناطق"
        ]

        # إنشاء 20 إعلان
        for i in range(20):
            # اختيار عشوائي للبيانات
            title = random.choice(ad_titles)
            description = random.choice(descriptions)
            price = random.randint(100, 10000)
            category = random.choice(categories)
            country = random.choice(countries)
            # التأكد من وجود states وcities
            valid_states = [s for s in states if s.country_id == country.id]
            if not valid_states:
                state = states[0] if states else None
            else:
                state = random.choice(valid_states)
            
            valid_cities = [c for c in cities if state and c.state_id == state.id]
            if not valid_cities:
                city = cities[0] if cities else None
            else:
                city = random.choice(valid_cities)
            
            # اختيار صورة مناسبة للفئة
            category_name = Category.query.get(category.id).name
            if category_name in category_images:
                selected_image = random.choice(category_images[category_name])
            else:
                selected_image = random.choice(category_images['أخرى'])
            
            images = [selected_image]

            # تحديد العنوان والوصف بناءً على الصورة
            if selected_image in image_details:
                title = image_details[selected_image]['title']
                description = image_details[selected_image]['description']
            else:
                title = random.choice(default_details['title'])
                description = random.choice(default_details['description'])

            # تحديد السعر بناءً على نوع المنتج
            if 'رنج روفر' in title or 'مرسيدس' in title:
                price = random.randint(500000, 1000000)
            elif 'شقة' in title:
                price = random.randint(1000000, 3000000)
            elif 'ايفون' in title or 'ماك بوك' in title:
                price = random.randint(3000, 8000)
            elif 'لابتوب' in title:
                price = random.randint(2000, 5000)
            elif 'غرفة نوم' in title or 'طقم كنب' in title:
                price = random.randint(5000, 15000)
            else:
                price = random.randint(500, 3000)

            # إنشاء الإعلان
            ad = Ad(
                title=f"{title} {i+1}",
                description=f"{description}\nمميزات إضافية للمنتج رقم {i+1}",
                price=price,
                currency="SAR",
                category_id=category.id,
                country_id=country.id,
                state_id=state.id,
                city_id=city.id,
                user_id=user.id,
                contact_phone="966500000000",
                contact_email="test@example.com",
                images=images,
                is_active=True,
                is_approved=True,
                created_at=datetime.utcnow(),
                views_count=random.randint(10, 100)
            )

            db.session.add(ad)

        try:
            db.session.commit()
            print("تم إضافة 20 إعلان بنجاح!")
        except Exception as e:
            db.session.rollback()
            print(f"حدث خطأ أثناء إضافة الإعلانات: {str(e)}")

if __name__ == "__main__":
    create_sample_ads()
