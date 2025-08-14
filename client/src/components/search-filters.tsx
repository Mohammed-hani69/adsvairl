import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { Category } from "@shared/schema";
import type { SearchFilters } from "@/lib/types";
import { LOCATIONS } from "@/lib/types";

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

export default function SearchFilters({ filters, onFiltersChange }: SearchFiltersProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
  };

  const clearFilters = () => {
    const emptyFilters: SearchFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  return (
    <Card className="sticky top-24" data-testid="card-search-filters">
      <CardHeader>
        <CardTitle className="text-lg font-bold">تصفية البحث</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Location Filter */}
        <div>
          <Label className="block text-sm font-semibold mb-2">المنطقة</Label>
          <Select
            value={localFilters.location || "all"}
            onValueChange={(value) => handleFilterChange("location", value === "all" ? undefined : value)}
          >
            <SelectTrigger data-testid="select-location">
              <SelectValue placeholder="جميع المناطق" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المناطق</SelectItem>
              {LOCATIONS.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price Range */}
        <div>
          <Label className="block text-sm font-semibold mb-2">نطاق السعر</Label>
          <div className="flex space-x-2 space-x-reverse">
            <Input
              type="number"
              placeholder="من"
              value={localFilters.minPrice || ""}
              onChange={(e) => handleFilterChange("minPrice", e.target.value ? parseInt(e.target.value) : undefined)}
              className="text-right"
              data-testid="input-min-price"
            />
            <Input
              type="number"
              placeholder="إلى"
              value={localFilters.maxPrice || ""}
              onChange={(e) => handleFilterChange("maxPrice", e.target.value ? parseInt(e.target.value) : undefined)}
              className="text-right"
              data-testid="input-max-price"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <Label className="block text-sm font-semibold mb-2">الفئة</Label>
          <Select
            value={localFilters.categoryId || "all"}
            onValueChange={(value) => handleFilterChange("categoryId", value === "all" ? undefined : value)}
          >
            <SelectTrigger data-testid="select-category">
              <SelectValue placeholder="جميع الفئات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الفئات</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex space-x-2 space-x-reverse">
          <Button 
            onClick={applyFilters}
            className="flex-1 bg-primary hover:bg-primary/90"
            data-testid="button-apply-filters"
          >
            تطبيق الفلاتر
          </Button>
          <Button 
            onClick={clearFilters}
            variant="outline"
            className="flex-1"
            data-testid="button-clear-filters"
          >
            مسح
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
