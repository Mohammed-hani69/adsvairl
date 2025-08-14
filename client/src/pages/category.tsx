import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import SearchFilters from "@/components/search-filters";
import AdCard from "@/components/ad-card";
import Footer from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdWithCategory, Category } from "@shared/schema";
import type { SearchFilters as SearchFiltersType } from "@/lib/types";

export default function CategoryPage() {
  const { categoryId } = useParams();
  const [filters, setFilters] = useState<SearchFiltersType>({ categoryId });

  const { data: category } = useQuery<Category>({
    queryKey: ["/api/categories", categoryId],
    enabled: !!categoryId,
  });

  const { data: ads, isLoading } = useQuery<AdWithCategory[]>({
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
    setFilters({ ...newFilters, categoryId });
  };

  return (
    <div className="min-h-screen bg-background font-cairo">
      <Header onSearch={handleSearch} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Header */}
        {category && (
          <div className="mb-8 text-center">
            <div className={`inline-flex items-center space-x-2 space-x-reverse text-4xl font-bold category-${category.nameEn}`}>
              <i className={category.icon} />
              <h1 className="font-cairo" data-testid="text-category-name">{category.name}</h1>
            </div>
            {category.description && (
              <p className="text-muted-foreground mt-2" data-testid="text-category-description">
                {category.description}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <SearchFilters filters={filters} onFiltersChange={handleFiltersChange} />
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground font-cairo">
                الإعلانات في {category?.name || "هذه الفئة"}
              </h2>
              <div className="text-sm text-muted-foreground">
                {ads && (
                  <span data-testid="text-ads-count">
                    {ads.length} إعلان
                  </span>
                )}
              </div>
            </div>

            {isLoading ? (
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
              <>
                {ads && ads.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="grid-category-ads">
                    {ads.map((ad) => (
                      <AdCard key={ad.id} ad={ad} variant="regular" />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12" data-testid="empty-state-category-ads">
                    <div className="text-6xl text-muted-foreground mb-4">📋</div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد إعلانات</h3>
                    <p className="text-muted-foreground mb-4">لم يتم العثور على إعلانات في هذه الفئة</p>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </main>

      <Footer />
    </div>
  );
}
