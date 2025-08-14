import { type User, type InsertUser, type Category, type InsertCategory, type Ad, type InsertAd, type AdWithCategory } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Ad operations
  getAds(filters?: { categoryId?: string; location?: string; minPrice?: number; maxPrice?: number; search?: string }): Promise<AdWithCategory[]>;
  getFeaturedAds(): Promise<AdWithCategory[]>;
  getAd(id: string): Promise<AdWithCategory | undefined>;
  createAd(ad: InsertAd): Promise<Ad>;
  updateAd(id: string, updates: Partial<Ad>): Promise<Ad | undefined>;
  deleteAd(id: string): Promise<boolean>;
  getUserAds(userId: string): Promise<AdWithCategory[]>;
  
  // Admin operations
  getPendingAds(): Promise<AdWithCategory[]>;
  approveAd(id: string): Promise<boolean>;
  rejectAd(id: string): Promise<boolean>;
  getAdStats(): Promise<{ totalAds: number; pendingAds: number; approvedAds: number; featuredAds: number }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private categories: Map<string, Category>;
  private ads: Map<string, Ad>;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.ads = new Map();
    
    // Initialize with default categories
    this.initializeDefaultCategories();
  }

  private async initializeDefaultCategories() {
    const defaultCategories: InsertCategory[] = [
      { name: "عقارات", nameEn: "real-estate", icon: "fas fa-home", color: "#EF4444", description: "بيع وشراء وإيجار العقارات" },
      { name: "سيارات", nameEn: "cars", icon: "fas fa-car", color: "#8B5CF6", description: "بيع وشراء السيارات والمركبات" },
      { name: "وظائف", nameEn: "jobs", icon: "fas fa-briefcase", color: "#06B6D4", description: "الوظائف والفرص المهنية" },
      { name: "إلكترونيات", nameEn: "electronics", icon: "fas fa-laptop", color: "#EC4899", description: "الأجهزة الإلكترونية والتقنية" },
      { name: "خدمات", nameEn: "services", icon: "fas fa-tools", color: "#84CC16", description: "الخدمات المتنوعة" },
      { name: "أزياء وموضة", nameEn: "fashion", icon: "fas fa-tshirt", color: "#F59E0B", description: "الملابس والإكسسوارات" },
    ];

    for (const category of defaultCategories) {
      await this.createCategory(category);
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      phone: insertUser.phone || null,
      isAdmin: false,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategory(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const category: Category = { 
      ...insertCategory, 
      id,
      description: insertCategory.description || null
    };
    this.categories.set(id, category);
    return category;
  }

  // Ad operations
  async getAds(filters?: { categoryId?: string; location?: string; minPrice?: number; maxPrice?: number; search?: string }): Promise<AdWithCategory[]> {
    let filteredAds = Array.from(this.ads.values()).filter(ad => ad.isApproved && ad.isActive);

    if (filters?.categoryId) {
      filteredAds = filteredAds.filter(ad => ad.categoryId === filters.categoryId);
    }

    if (filters?.location) {
      filteredAds = filteredAds.filter(ad => 
        ad.location.toLowerCase().includes(filters.location!.toLowerCase())
      );
    }

    if (filters?.minPrice !== undefined) {
      filteredAds = filteredAds.filter(ad => ad.price && ad.price >= filters.minPrice!);
    }

    if (filters?.maxPrice !== undefined) {
      filteredAds = filteredAds.filter(ad => ad.price && ad.price <= filters.maxPrice!);
    }

    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredAds = filteredAds.filter(ad => 
        ad.title.toLowerCase().includes(searchTerm) || 
        ad.description.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by creation date (newest first)
    filteredAds.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return Promise.all(filteredAds.map(ad => this.enrichAdWithCategoryAndUser(ad)));
  }

  async getFeaturedAds(): Promise<AdWithCategory[]> {
    const featuredAds = Array.from(this.ads.values())
      .filter(ad => ad.isFeatured && ad.isApproved && ad.isActive)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 6);

    return Promise.all(featuredAds.map(ad => this.enrichAdWithCategoryAndUser(ad)));
  }

  async getAd(id: string): Promise<AdWithCategory | undefined> {
    const ad = this.ads.get(id);
    if (!ad) return undefined;

    // Increment view count
    ad.views = (ad.views || 0) + 1;
    this.ads.set(id, ad);

    return this.enrichAdWithCategoryAndUser(ad);
  }

  private async enrichAdWithCategoryAndUser(ad: Ad): Promise<AdWithCategory> {
    const category = await this.getCategory(ad.categoryId);
    const user = await this.getUser(ad.userId);
    
    return {
      ...ad,
      category: category!,
      user: { username: user?.username || 'مجهول' }
    };
  }

  async createAd(insertAd: InsertAd): Promise<Ad> {
    const id = randomUUID();
    const ad: Ad = {
      ...insertAd,
      id,
      email: insertAd.email || null,
      price: insertAd.price || null,
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.ads.set(id, ad);
    return ad;
  }

  async updateAd(id: string, updates: Partial<Ad>): Promise<Ad | undefined> {
    const ad = this.ads.get(id);
    if (!ad) return undefined;

    const updatedAd = { ...ad, ...updates, updatedAt: new Date() };
    this.ads.set(id, updatedAd);
    return updatedAd;
  }

  async deleteAd(id: string): Promise<boolean> {
    return this.ads.delete(id);
  }

  async getUserAds(userId: string): Promise<AdWithCategory[]> {
    const userAds = Array.from(this.ads.values())
      .filter(ad => ad.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return Promise.all(userAds.map(ad => this.enrichAdWithCategoryAndUser(ad)));
  }

  // Admin operations
  async getPendingAds(): Promise<AdWithCategory[]> {
    const pendingAds = Array.from(this.ads.values())
      .filter(ad => !ad.isApproved && ad.isActive)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return Promise.all(pendingAds.map(ad => this.enrichAdWithCategoryAndUser(ad)));
  }

  async approveAd(id: string): Promise<boolean> {
    const ad = this.ads.get(id);
    if (!ad) return false;

    ad.isApproved = true;
    ad.updatedAt = new Date();
    this.ads.set(id, ad);
    return true;
  }

  async rejectAd(id: string): Promise<boolean> {
    const ad = this.ads.get(id);
    if (!ad) return false;

    ad.isActive = false;
    ad.updatedAt = new Date();
    this.ads.set(id, ad);
    return true;
  }

  async getAdStats(): Promise<{ totalAds: number; pendingAds: number; approvedAds: number; featuredAds: number }> {
    const allAds = Array.from(this.ads.values()).filter(ad => ad.isActive);
    
    return {
      totalAds: allAds.length,
      pendingAds: allAds.filter(ad => !ad.isApproved).length,
      approvedAds: allAds.filter(ad => ad.isApproved).length,
      featuredAds: allAds.filter(ad => ad.isFeatured && ad.isApproved).length,
    };
  }
}

export const storage = new MemStorage();
