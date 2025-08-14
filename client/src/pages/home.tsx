import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/header";
import CategoryNav from "@/components/category-nav";
import SearchFilters from "@/components/search-filters";
import AdCard from "@/components/ad-card";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Star, Zap } from "lucide-react";
import type { AdWithCategory } from "@shared/schema";
import type { SearchFilters as SearchFiltersType } from "@/lib/types";

export default function Home() {
  const [filters, setFilters] = useState<SearchFiltersType>({});

  const { data: featuredAds, isLoading: featuredLoading } = useQuery<AdWithCategory[]>({
    queryKey: ["/api/ads/featured"],
  });

  const { data: allAds, isLoading: allAdsLoading } = useQuery<AdWithCategory[]>({
    queryKey: ["/api/ads", filters],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (filters.categoryId) searchParams.append('categoryId', filters.categoryId);
      if (filters.location) searchParams.append('location', filters.location);
      if (filters.minPrice) searchParams.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) searchParams.append('maxPrice', filters.maxPrice.toString());
      if (filters.search) searchParams.append('search', filters.search);
      
      const url = `/api/ads${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    },
  });

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query }));
  };

  const handleFiltersChange = (newFilters: SearchFiltersType) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-background font-cairo">
      <Header onSearch={handleSearch} />
      <CategoryNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <section className="mb-12">
          <div 
            className="relative bg-gradient-to-l from-primary to-blue-600 rounded-2xl overflow-hidden"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1920&h=600')",
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-l from-primary/80 to-blue-600/80"></div>
            <div className="relative px-8 py-16 text-center text-white">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 font-cairo">اكتشف عالم الإعلانات</h2>
              <p className="text-xl mb-8 text-blue-100">
                منصة شاملة لجميع احتياجاتك - من العقارات إلى السيارات والوظائف
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold" data-testid="text-stats-ads">25,000+</div>
                  <div className="text-blue-100">إعلان نشط</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold" data-testid="text-stats-users">50,000+</div>
                  <div className="text-blue-100">مستخدم</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold" data-testid="text-stats-categories">12</div>
                  <div className="text-blue-100">فئة رئيسية</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold" data-testid="text-stats-daily">500+</div>
                  <div className="text-blue-100">إعلان يومياً</div>
                </div>
              </div>
              
              {/* VIP Button */}
              <div className="flex justify-center">
                <Link href="/become-vip">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-orange-500 hover:from-yellow-600 hover:via-yellow-500 hover:to-orange-600 text-black font-bold px-8 py-4 text-lg shadow-2xl border-2 border-yellow-300 transform hover:scale-105 transition-all duration-300 animate-pulse"
                    data-testid="button-become-vip"
                  >
                    <Crown className="h-6 w-6 mr-3 text-black" />
                    خليك VIP
                    <Star className="h-5 w-5 mr-2 text-yellow-600" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* VIP Features Section */}
        <section className="mb-12">
          <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-50 dark:from-yellow-950/20 dark:via-orange-950/20 dark:to-yellow-950/20 rounded-2xl p-8 border border-yellow-200 dark:border-yellow-800/30">
            <div className="text-center mb-8">
              <Crown className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                مميزات عضوية VIP الحصرية
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                انضم إلى نخبة التجار واحصل على متجرك الخاص مع مميزات لا تُقاوم
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-yellow-200 dark:border-yellow-700/30">
                <Crown className="h-10 w-10 text-yellow-600 mx-auto mb-4" />
                <h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">متجرك الخاص</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  احصل على متجر إلكتروني كامل بعلامتك التجارية ولوجو مخصص
                </p>
              </div>
              
              <div className="text-center bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-yellow-200 dark:border-yellow-700/30">
                <Zap className="h-10 w-10 text-yellow-600 mx-auto mb-4" />
                <h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">إعلانات مميزة</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  إعلاناتك ستظهر في المقدمة وبتصميم مميز يلفت الانتباه
                </p>
              </div>
              
              <div className="text-center bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-yellow-200 dark:border-yellow-700/30">
                <Star className="h-10 w-10 text-yellow-600 mx-auto mb-4" />
                <h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">شارة VIP</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  شارة ذهبية تميزك عن باقي المعلنين وتزيد من ثقة العملاء
                </p>
              </div>
            </div>
            
            <div className="text-center mt-8">
              <Link href="/become-vip">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold px-8 py-3 shadow-lg"
                  data-testid="button-vip-features"
                >
                  <Crown className="h-5 w-5 mr-2" />
                  ابدأ رحلتك كتاجر VIP
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <SearchFilters filters={filters} onFiltersChange={handleFiltersChange} />
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            {/* Featured Ads Section */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground font-cairo">الإعلانات المميزة</h2>
                <Button variant="link" className="text-primary hover:text-primary/80">
                  عرض الكل
                </Button>
              </div>
              
              {featuredLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="h-48 w-full rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="grid-featured-ads">
                  {featuredAds?.map((ad) => (
                    <AdCard key={ad.id} ad={ad} variant="featured" />
                  ))}
                </div>
              )}
            </section>

            {/* All Ads Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground font-cairo">جميع الإعلانات</h2>
                <div className="flex items-center space-x-4 space-x-reverse">
                  {/* TODO: Add sorting dropdown */}
                </div>
              </div>

              {allAdsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex space-x-4 space-x-reverse">
                      <Skeleton className="h-24 w-32 flex-shrink-0 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="grid-all-ads">
                  {allAds?.map((ad) => (
                    <AdCard key={ad.id} ad={ad} variant="regular" />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!allAdsLoading && (!allAds || allAds.length === 0) && (
                <div className="text-center py-12" data-testid="empty-state-ads">
                  <div className="text-6xl text-muted-foreground mb-4">📋</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد إعلانات</h3>
                  <p className="text-muted-foreground mb-4">لم يتم العثور على إعلانات تطابق معايير البحث</p>
                  <Button onClick={() => setFilters({})}>مسح الفلاتر</Button>
                </div>
              )}
            </section>
          </main>
        </div>
      </main>

      <Footer />
    </div>
  );
}
