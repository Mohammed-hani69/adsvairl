import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4 font-cairo">سوق الإعلانات</h3>
            <p className="text-slate-300 mb-4">
              منصة شاملة للإعلانات المبوبة في جميع المجالات
            </p>
            <div className="flex space-x-4 space-x-reverse">
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <i className="fab fa-facebook text-xl"></i>
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <i className="fab fa-twitter text-xl"></i>
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <i className="fab fa-instagram text-xl"></i>
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 font-cairo">الفئات الرئيسية</h4>
            <ul className="space-y-2 text-slate-300">
              <li>
                <Link href="/category/real-estate" className="hover:text-white transition-colors">
                  عقارات
                </Link>
              </li>
              <li>
                <Link href="/category/cars" className="hover:text-white transition-colors">
                  سيارات
                </Link>
              </li>
              <li>
                <Link href="/category/jobs" className="hover:text-white transition-colors">
                  وظائف
                </Link>
              </li>
              <li>
                <Link href="/category/electronics" className="hover:text-white transition-colors">
                  إلكترونيات
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 font-cairo">روابط مهمة</h4>
            <ul className="space-y-2 text-slate-300">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  حول الموقع
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  سياسة الخصوصية
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  شروط الاستخدام
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  اتصل بنا
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 font-cairo">تواصل معنا</h4>
            <div className="space-y-2 text-slate-300">
              <p className="flex items-center">
                <i className="fas fa-phone ml-2"></i>
                <span>+966 11 234 5678</span>
              </p>
              <p className="flex items-center">
                <i className="fas fa-envelope ml-2"></i>
                <span>info@ads-market.sa</span>
              </p>
              <p className="flex items-center">
                <i className="fas fa-map-marker-alt ml-2"></i>
                <span>الرياض، المملكة العربية السعودية</span>
              </p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
          <p>&copy; 2024 سوق الإعلانات. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
