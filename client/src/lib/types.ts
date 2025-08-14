export interface SearchFilters {
  categoryId?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

export interface CategoryInfo {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  description?: string;
}

export const LOCATIONS = [
  "الرياض",
  "جدة", 
  "الدمام",
  "مكة المكرمة",
  "المدينة المنورة",
  "تبوك",
  "أبها",
  "بريدة",
  "خميس مشيط",
  "الطائف"
];
