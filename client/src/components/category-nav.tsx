import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Category } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoryNav() {
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  if (isLoading) {
    return (
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 space-x-reverse overflow-x-auto py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-20 flex-shrink-0" />
            ))}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 space-x-reverse overflow-x-auto py-4">
          {categories?.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.id}`}
              className={`flex items-center space-x-2 space-x-reverse whitespace-nowrap font-semibold hover:opacity-80 transition-opacity category-${category.nameEn}`}
              data-testid={`link-category-${category.nameEn}`}
            >
              <i className={category.icon} />
              <span>{category.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
