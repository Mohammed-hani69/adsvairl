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
    this.initializeDefaultCategories().then(() => {
      console.log("Categories initialized, starting sample data initialization...");
    });
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

    console.log("Initializing default categories...");
    for (const category of defaultCategories) {
      const created = await this.createCategory(category);
      console.log(`Created category: ${created.name} (${created.nameEn})`);
    }
    console.log(`Total categories after initialization: ${this.categories.size}`);
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
      currency: insertAd.currency || null,
      images: insertAd.images || null,
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

// Initialize with sample data for testing
async function initializeSampleData() {
  try {
    // Create sample user
    const sampleUser = await storage.createUser({
      username: "المستخدم التجريبي",
      email: "test@example.com",
      password: "password123",
    });

    // Get categories
    const categories = await storage.getCategories();
    
    if (categories.length === 0) {
      console.log("No categories found, skipping sample data initialization");
      return;
    }

    // Create sample ads for all categories
    const sampleAds = [];
    
    // Real Estate ads
    const realEstateCat = categories.find(c => c.nameEn === "real-estate");
    if (realEstateCat) {
      sampleAds.push(
        {
          title: "شقة للإيجار في الرياض - حي الملز",
          description: "شقة مميزة للإيجار في حي الملز بالرياض، تتكون من 3 غرف نوم، 2 حمام، صالة، مطبخ مجهز. الشقة في الدور الثالث مع مصعد، موقف سيارة، قريبة من المدارس والخدمات.",
          price: 2500,
          currency: "ريال",
          categoryId: realEstateCat.id,
          location: "الرياض",
          phone: "0551234567",
          email: "owner1@example.com",
          userId: sampleUser.id,
          images: [],
          isApproved: true,
          isActive: true,
          isFeatured: true,
        },
        {
          title: "فيلا للبيع في الدمام",
          description: "فيلا جديدة للبيع في حي الواحة بالدمام، مساحة الأرض 600 متر، مساحة البناء 400 متر، 5 غرف نوم، 4 حمامات، مجلس، صالة، مطبخ مجهز، حديقة واسعة.",
          price: 950000,
          currency: "ريال",
          categoryId: realEstateCat.id,
          location: "الدمام",
          phone: "0557788991",
          userId: sampleUser.id,
          images: [],
          isApproved: true,
          isActive: true,
          isFeatured: false,
        }
      );
    }
    
    // Cars ads
    const carsCat = categories.find(c => c.nameEn === "cars");
    if (carsCat) {
      sampleAds.push(
        {
          title: "سيارة تويوتا كامري 2020 للبيع",
          description: "سيارة تويوتا كامري موديل 2020، لون أبيض، ممشى 45 ألف كيلو، حالة ممتازة، سيرفس منتظم في الوكالة، جميع الأوراق سليمة.",
          price: 85000,
          currency: "ريال",
          categoryId: carsCat.id,
          location: "جدة",
          phone: "0509876543",
          userId: sampleUser.id,
          images: [],
          isApproved: true,
          isActive: true,
          isFeatured: false,
        },
        {
          title: "هوندا أكورد 2019 نظيفة جداً",
          description: "سيارة هوندا أكورد موديل 2019، لون أسود، ممشى 38 ألف كيلو، فل أوبشن، جلد، فتحة سقف، كشافات زينون، حالة الوكالة.",
          price: 72000,
          currency: "ريال",
          categoryId: carsCat.id,
          location: "المدينة المنورة",
          phone: "0551122334",
          userId: sampleUser.id,
          images: [],
          isApproved: true,
          isActive: true,
          isFeatured: true,
        }
      );
    }
    
    // Jobs ads
    const jobsCat = categories.find(c => c.nameEn === "jobs");
    if (jobsCat) {
      sampleAds.push(
        {
          title: "مطلوب مطور مواقع - React & Node.js",
          description: "نبحث عن مطور مواقع محترف للعمل في شركة تقنية ناشئة. المطلوب خبرة في React, Node.js, TypeScript. راتب مجزي ومزايا ممتازة.",
          price: null,
          currency: "ريال",
          categoryId: jobsCat.id,
          location: "دبي",
          phone: "0501122334",
          email: "hr@techcompany.com",
          userId: sampleUser.id,
          images: [],
          isApproved: true,
          isActive: true,
          isFeatured: false,
        }
      );
    }
    
    // Electronics ads
    const electronicsCat = categories.find(c => c.nameEn === "electronics");
    if (electronicsCat) {
      sampleAds.push(
        {
          title: "لابتوب MacBook Pro M3 جديد",
          description: "لابتوب MacBook Pro مع معالج M3، رام 16GB، تخزين 512GB SSD، شاشة 14 بوصة Liquid Retina XDR. جديد بالكرتونة مع جميع الاكسسوارات.",
          price: 8500,
          currency: "ريال",
          categoryId: electronicsCat.id,
          location: "الكويت",
          phone: "0556677889",
          userId: sampleUser.id,
          images: [],
          isApproved: true,
          isActive: true,
          isFeatured: false,
        },
        {
          title: "آيفون 15 Pro Max جديد بالكرتونة",
          description: "آيفون 15 Pro Max، 256 جيجا، لون تايتانيوم أزرق، جديد لم يستخدم، مع جميع الاكسسوارات الأصلية، ضمان سنة من آبل.",
          price: 5200,
          currency: "ريال",
          categoryId: electronicsCat.id,
          location: "الرياض",
          phone: "0543344556",
          userId: sampleUser.id,
          images: [],
          isApproved: false, // Pending approval
          isActive: true,
          isFeatured: false,
        },
        {
          title: "سماعات AirPods Pro للبيع",
          description: "سماعات أبل AirPods Pro الجيل الثاني، حالة ممتازة، استخدام شهرين فقط، مع العلبة الأصلية وجميع الاكسسوارات.",
          price: 850,
          currency: "ريال",
          categoryId: electronicsCat.id,
          location: "جدة",
          phone: "0566778899",
          userId: sampleUser.id,
          images: [],
          isApproved: false, // Pending approval
          isActive: true,
          isFeatured: false,
        }
      );
    }
    
    // Services ads
    const servicesCat = categories.find(c => c.nameEn === "services");
    if (servicesCat) {
      sampleAds.push(
        {
          title: "خدمات تنظيف منازل",
          description: "نقدم خدمات تنظيف المنازل والشقق والفلل بأفضل الأسعار. فريق محترف مدرب ومجهز بأحدث المعدات. خدمة على مدار الساعة.",
          price: 150,
          currency: "ريال",
          categoryId: servicesCat.id,
          location: "أبوظبي",
          phone: "0542233445",
          email: "cleaning@service.com",
          userId: sampleUser.id,
          images: [],
          isApproved: true,
          isActive: true,
          isFeatured: true,
        }
      );
    }

    // Create the ads
    for (const adData of sampleAds) {
      await storage.createAd(adData);
    }
    
    console.log(`Initialized ${sampleAds.length} sample ads successfully`);
    console.log("Available categories:", categories.map(c => `${c.name} (${c.nameEn})`));
    console.log("Created ads:", sampleAds.map(ad => `${ad.title} - ${ad.isApproved ? 'Approved' : 'Pending'}`));
  } catch (error) {
    console.error("Error initializing sample data:", error);
  }
}

// Initialize sample data after a short delay to ensure categories are loaded
setTimeout(() => {
  initializeSampleData().catch(console.error);
}, 100);
