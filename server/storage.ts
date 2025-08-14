import { 
  type User, type InsertUser, type Category, type InsertCategory, 
  type Ad, type InsertAd, type AdWithCategory,
  type Country, type InsertCountry, type State, type InsertState, 
  type City, type InsertCity, type VipStore, type InsertVipStore, 
  type VipOrder, type InsertVipOrder, type StoreProduct, type InsertStoreProduct,
  type VipStoreWithLocation,
  users, categories, ads, countries, states, cities, vipStores, vipOrders, storeProducts
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, or, like, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
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
  
  // VIP System - Countries and locations
  getCountries(): Promise<Country[]>;
  getCountry(id: string): Promise<Country | undefined>;
  createCountry(country: InsertCountry): Promise<Country>;
  updateCountry(id: string, updates: Partial<Country>): Promise<Country | undefined>;
  
  getStates(countryId: string): Promise<State[]>;
  getState(id: string): Promise<State | undefined>;
  createState(state: InsertState): Promise<State>;
  
  getCities(stateId: string): Promise<City[]>;
  getCity(id: string): Promise<City | undefined>;
  createCity(city: InsertCity): Promise<City>;
  
  // VIP System - Stores
  getVipStores(): Promise<VipStoreWithLocation[]>;
  getVipStore(id: string): Promise<VipStoreWithLocation | undefined>;
  getUserVipStore(userId: string): Promise<VipStoreWithLocation | undefined>;
  createVipStore(store: InsertVipStore): Promise<VipStore>;
  updateVipStore(id: string, updates: Partial<VipStore>): Promise<VipStore | undefined>;
  approveVipStore(id: string): Promise<boolean>;
  
  // VIP System - Orders
  getVipOrders(): Promise<VipOrder[]>;
  getVipOrder(id: string): Promise<VipOrder | undefined>;
  getUserVipOrders(userId: string): Promise<VipOrder[]>;
  createVipOrder(order: InsertVipOrder): Promise<VipOrder>;
  updateVipOrder(id: string, updates: Partial<VipOrder>): Promise<VipOrder | undefined>;
  
  // VIP System - Store Products
  getStoreProducts(storeId: string): Promise<StoreProduct[]>;
  getStoreProduct(id: string): Promise<StoreProduct | undefined>;
  createStoreProduct(product: InsertStoreProduct): Promise<StoreProduct>;
  updateStoreProduct(id: string, updates: Partial<StoreProduct>): Promise<StoreProduct | undefined>;
  deleteStoreProduct(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize with default data
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    try {
      await this.initializeDefaultCategories();
      await this.initializeDefaultCountries();
      await this.initializeSampleData();
    } catch (error) {
      console.error("Error initializing default data:", error);
    }
  }

  private async initializeDefaultCategories() {
    try {
      const existingCategories = await db.select().from(categories);
      if (existingCategories.length > 0) return;

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
        await db.insert(categories).values(category);
      }
      console.log(`Initialized ${defaultCategories.length} categories`);
    } catch (error) {
      console.error("Error initializing categories:", error);
    }
  }

  private async initializeDefaultCountries() {
    try {
      const existingCountries = await db.select().from(countries);
      if (existingCountries.length > 0) return;

      const defaultCountries: InsertCountry[] = [
        {
          name: "مصر",
          nameEn: "Egypt",
          code: "EG",
          currency: "جنيه مصري",
          vipPrice: "350.00",
          paymentMethods: ["bank_transfer"],
          requiresTransferProof: true,
          isActive: true,
        },
        {
          name: "السعودية", 
          nameEn: "Saudi Arabia",
          code: "SA",
          currency: "ريال سعودي", 
          vipPrice: "525.00",
          paymentMethods: ["bank_transfer", "stripe"],
          requiresTransferProof: false,
          isActive: true,
        },
        {
          name: "الإمارات",
          nameEn: "UAE",
          code: "AE", 
          currency: "درهم إماراتي",
          vipPrice: "515.00",
          paymentMethods: ["bank_transfer", "stripe"],
          requiresTransferProof: false,
          isActive: true,
        },
      ];

      console.log("Initializing default countries...");
      for (const country of defaultCountries) {
        const [createdCountry] = await db.insert(countries).values(country).returning();
        
        // Add sample states and cities
        if (country.code === "EG") {
          const [cairo] = await db.insert(states).values({
            name: "القاهرة",
            nameEn: "Cairo", 
            countryId: createdCountry.id
          }).returning();
          
          await db.insert(cities).values([
            { name: "مدينة نصر", nameEn: "Nasr City", stateId: cairo.id },
            { name: "المعادي", nameEn: "Maadi", stateId: cairo.id },
            { name: "الزمالك", nameEn: "Zamalek", stateId: cairo.id },
          ]);
        }
      }
      console.log(`Initialized ${defaultCountries.length} countries with states and cities`);
    } catch (error) {
      console.error("Error initializing countries:", error);
    }
  }

  private async initializeSampleData() {
    try {
      const existingAds = await db.select().from(ads);
      if (existingAds.length > 0) return;

      // Create sample user
      const [sampleUser] = await db.insert(users).values({
        username: "المستخدم التجريبي",
        email: "test@example.com",
        password: "password123",
        phone: "0551234567",
        isAdmin: false,
        isVip: false,
      }).returning();

      // Get categories
      const existingCategories = await db.select().from(categories);
      if (existingCategories.length === 0) return;

      // Create sample ads
      const sampleAds = [];
      
      const realEstateCat = existingCategories.find(c => c.nameEn === "real-estate");
      if (realEstateCat) {
        sampleAds.push(
          {
            title: "شقة للإيجار في الرياض - حي الملز",
            description: "شقة مميزة للإيجار في حي الملز بالرياض، تتكون من 3 غرف نوم، 2 حمام، صالة، مطبخ مجهز.",
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
            description: "فيلا جديدة للبيع في حي الواحة بالدمام، مساحة الأرض 600 متر، مساحة البناء 400 متر.",
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

      for (const adData of sampleAds) {
        await db.insert(ads).values(adData);
      }
      
      console.log(`Initialized ${sampleAds.length} sample ads`);
    } catch (error) {
      console.error("Error initializing sample data:", error);
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      isAdmin: false,
      isVip: false,
    }).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  // Ad operations
  async getAds(filters?: { categoryId?: string; location?: string; minPrice?: number; maxPrice?: number; search?: string }): Promise<AdWithCategory[]> {
    const conditions = [eq(ads.isApproved, true), eq(ads.isActive, true)];
    
    if (filters?.categoryId) {
      conditions.push(eq(ads.categoryId, filters.categoryId));
    }
    if (filters?.location) {
      conditions.push(like(ads.location, `%${filters.location}%`));
    }
    if (filters?.minPrice !== undefined) {
      conditions.push(gte(ads.price, filters.minPrice));
    }
    if (filters?.maxPrice !== undefined) {
      conditions.push(lte(ads.price, filters.maxPrice));
    }
    if (filters?.search) {
      conditions.push(
        or(
          like(ads.title, `%${filters.search}%`),
          like(ads.description, `%${filters.search}%`)
        )!
      );
    }

    return await db.select({
      id: ads.id,
      title: ads.title,
      description: ads.description,
      price: ads.price,
      currency: ads.currency,
      categoryId: ads.categoryId,
      userId: ads.userId,
      location: ads.location,
      phone: ads.phone,
      email: ads.email,
      images: ads.images,
      isFeatured: ads.isFeatured,
      isApproved: ads.isApproved,
      isActive: ads.isActive,
      views: ads.views,
      createdAt: ads.createdAt,
      updatedAt: ads.updatedAt,
      category: {
        id: categories.id,
        name: categories.name,
        nameEn: categories.nameEn,
        icon: categories.icon,
        color: categories.color,
        description: categories.description,
      },
      user: {
        username: users.username,
      }
    })
    .from(ads)
    .innerJoin(categories, eq(ads.categoryId, categories.id))
    .innerJoin(users, eq(ads.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(ads.createdAt));
  }

  async getFeaturedAds(): Promise<AdWithCategory[]> {
    return await db.select({
      id: ads.id,
      title: ads.title,
      description: ads.description,
      price: ads.price,
      currency: ads.currency,
      categoryId: ads.categoryId,
      userId: ads.userId,
      location: ads.location,
      phone: ads.phone,
      email: ads.email,
      images: ads.images,
      isFeatured: ads.isFeatured,
      isApproved: ads.isApproved,
      isActive: ads.isActive,
      views: ads.views,
      createdAt: ads.createdAt,
      updatedAt: ads.updatedAt,
      category: {
        id: categories.id,
        name: categories.name,
        nameEn: categories.nameEn,
        icon: categories.icon,
        color: categories.color,
        description: categories.description,
      },
      user: {
        username: users.username,
      }
    })
    .from(ads)
    .innerJoin(categories, eq(ads.categoryId, categories.id))
    .innerJoin(users, eq(ads.userId, users.id))
    .where(and(
      eq(ads.isFeatured, true),
      eq(ads.isApproved, true),
      eq(ads.isActive, true)
    ))
    .orderBy(desc(ads.createdAt))
    .limit(6);
  }

  async getAd(id: string): Promise<AdWithCategory | undefined> {
    // Increment view count
    await db.update(ads)
      .set({ views: sql`${ads.views} + 1` })
      .where(eq(ads.id, id));

    const [ad] = await db.select({
      id: ads.id,
      title: ads.title,
      description: ads.description,
      price: ads.price,
      currency: ads.currency,
      categoryId: ads.categoryId,
      userId: ads.userId,
      location: ads.location,
      phone: ads.phone,
      email: ads.email,
      images: ads.images,
      isFeatured: ads.isFeatured,
      isApproved: ads.isApproved,
      isActive: ads.isActive,
      views: ads.views,
      createdAt: ads.createdAt,
      updatedAt: ads.updatedAt,
      category: {
        id: categories.id,
        name: categories.name,
        nameEn: categories.nameEn,
        icon: categories.icon,
        color: categories.color,
        description: categories.description,
      },
      user: {
        username: users.username,
      }
    })
    .from(ads)
    .innerJoin(categories, eq(ads.categoryId, categories.id))
    .innerJoin(users, eq(ads.userId, users.id))
    .where(eq(ads.id, id));

    return ad;
  }

  async createAd(insertAd: InsertAd): Promise<Ad> {
    const [ad] = await db.insert(ads).values({
      ...insertAd,
      views: 0,
    }).returning();
    return ad;
  }

  async updateAd(id: string, updates: Partial<Ad>): Promise<Ad | undefined> {
    const [ad] = await db.update(ads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(ads.id, id))
      .returning();
    return ad;
  }

  async deleteAd(id: string): Promise<boolean> {
    const result = await db.delete(ads).where(eq(ads.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getUserAds(userId: string): Promise<AdWithCategory[]> {
    return await db.select({
      id: ads.id,
      title: ads.title,
      description: ads.description,
      price: ads.price,
      currency: ads.currency,
      categoryId: ads.categoryId,
      userId: ads.userId,
      location: ads.location,
      phone: ads.phone,
      email: ads.email,
      images: ads.images,
      isFeatured: ads.isFeatured,
      isApproved: ads.isApproved,
      isActive: ads.isActive,
      views: ads.views,
      createdAt: ads.createdAt,
      updatedAt: ads.updatedAt,
      category: {
        id: categories.id,
        name: categories.name,
        nameEn: categories.nameEn,
        icon: categories.icon,
        color: categories.color,
        description: categories.description,
      },
      user: {
        username: users.username,
      }
    })
    .from(ads)
    .innerJoin(categories, eq(ads.categoryId, categories.id))
    .innerJoin(users, eq(ads.userId, users.id))
    .where(eq(ads.userId, userId))
    .orderBy(desc(ads.createdAt));
  }

  // Admin operations
  async getPendingAds(): Promise<AdWithCategory[]> {
    return await db.select({
      id: ads.id,
      title: ads.title,
      description: ads.description,
      price: ads.price,
      currency: ads.currency,
      categoryId: ads.categoryId,
      userId: ads.userId,
      location: ads.location,
      phone: ads.phone,
      email: ads.email,
      images: ads.images,
      isFeatured: ads.isFeatured,
      isApproved: ads.isApproved,
      isActive: ads.isActive,
      views: ads.views,
      createdAt: ads.createdAt,
      updatedAt: ads.updatedAt,
      category: {
        id: categories.id,
        name: categories.name,
        nameEn: categories.nameEn,
        icon: categories.icon,
        color: categories.color,
        description: categories.description,
      },
      user: {
        username: users.username,
      }
    })
    .from(ads)
    .innerJoin(categories, eq(ads.categoryId, categories.id))
    .innerJoin(users, eq(ads.userId, users.id))
    .where(and(eq(ads.isApproved, false), eq(ads.isActive, true)))
    .orderBy(desc(ads.createdAt));
  }

  async approveAd(id: string): Promise<boolean> {
    const result = await db.update(ads)
      .set({ isApproved: true, updatedAt: new Date() })
      .where(eq(ads.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async rejectAd(id: string): Promise<boolean> {
    const result = await db.update(ads)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(ads.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAdStats(): Promise<{ totalAds: number; pendingAds: number; approvedAds: number; featuredAds: number }> {
    const [totalResult] = await db.select({ 
      count: sql<number>`count(*)`.mapWith(Number) 
    }).from(ads).where(eq(ads.isActive, true));
    
    const [pendingResult] = await db.select({ 
      count: sql<number>`count(*)`.mapWith(Number) 
    }).from(ads).where(and(eq(ads.isActive, true), eq(ads.isApproved, false)));
    
    const [approvedResult] = await db.select({ 
      count: sql<number>`count(*)`.mapWith(Number) 
    }).from(ads).where(and(eq(ads.isActive, true), eq(ads.isApproved, true)));
    
    const [featuredResult] = await db.select({ 
      count: sql<number>`count(*)`.mapWith(Number) 
    }).from(ads).where(and(eq(ads.isActive, true), eq(ads.isApproved, true), eq(ads.isFeatured, true)));

    return {
      totalAds: totalResult.count,
      pendingAds: pendingResult.count,
      approvedAds: approvedResult.count,
      featuredAds: featuredResult.count,
    };
  }

  // VIP System - Countries and locations
  async getCountries(): Promise<Country[]> {
    return await db.select().from(countries).where(eq(countries.isActive, true));
  }

  async getCountry(id: string): Promise<Country | undefined> {
    const [country] = await db.select().from(countries).where(eq(countries.id, id));
    return country;
  }

  async createCountry(insertCountry: InsertCountry): Promise<Country> {
    const [country] = await db.insert(countries).values(insertCountry).returning();
    return country;
  }

  async updateCountry(id: string, updates: Partial<Country>): Promise<Country | undefined> {
    const [country] = await db.update(countries)
      .set(updates)
      .where(eq(countries.id, id))
      .returning();
    return country;
  }

  async getStates(countryId: string): Promise<State[]> {
    return await db.select().from(states).where(eq(states.countryId, countryId));
  }

  async getState(id: string): Promise<State | undefined> {
    const [state] = await db.select().from(states).where(eq(states.id, id));
    return state;
  }

  async createState(insertState: InsertState): Promise<State> {
    const [state] = await db.insert(states).values(insertState).returning();
    return state;
  }

  async getCities(stateId: string): Promise<City[]> {
    return await db.select().from(cities).where(eq(cities.stateId, stateId));
  }

  async getCity(id: string): Promise<City | undefined> {
    const [city] = await db.select().from(cities).where(eq(cities.id, id));
    return city;
  }

  async createCity(insertCity: InsertCity): Promise<City> {
    const [city] = await db.insert(cities).values(insertCity).returning();
    return city;
  }

  // VIP System - Stores
  async getVipStores(): Promise<VipStoreWithLocation[]> {
    return await db.select({
      id: vipStores.id,
      userId: vipStores.userId,
      storeName: vipStores.storeName,
      brandName: vipStores.brandName,
      specialty: vipStores.specialty,
      logo: vipStores.logo,
      banner: vipStores.banner,
      address: vipStores.address,
      countryId: vipStores.countryId,
      stateId: vipStores.stateId,
      cityId: vipStores.cityId,
      phone: vipStores.phone,
      isActive: vipStores.isActive,
      isApproved: vipStores.isApproved,
      createdAt: vipStores.createdAt,
      updatedAt: vipStores.updatedAt,
      country: {
        id: countries.id,
        name: countries.name,
        nameEn: countries.nameEn,
        code: countries.code,
        currency: countries.currency,
        vipPrice: countries.vipPrice,
        paymentMethods: countries.paymentMethods,
        requiresTransferProof: countries.requiresTransferProof,
        isActive: countries.isActive,
        createdAt: countries.createdAt,
      },
      state: {
        id: states.id,
        name: states.name,
        nameEn: states.nameEn,
        countryId: states.countryId,
      },
      city: {
        id: cities.id,
        name: cities.name,
        nameEn: cities.nameEn,
        stateId: cities.stateId,
      },
      user: {
        username: users.username,
        isVip: users.isVip,
      }
    })
    .from(vipStores)
    .innerJoin(countries, eq(vipStores.countryId, countries.id))
    .innerJoin(states, eq(vipStores.stateId, states.id))
    .innerJoin(cities, eq(vipStores.cityId, cities.id))
    .innerJoin(users, eq(vipStores.userId, users.id));
  }

  async getVipStore(id: string): Promise<VipStoreWithLocation | undefined> {
    const [store] = await db.select({
      id: vipStores.id,
      userId: vipStores.userId,
      storeName: vipStores.storeName,
      brandName: vipStores.brandName,
      specialty: vipStores.specialty,
      logo: vipStores.logo,
      banner: vipStores.banner,
      address: vipStores.address,
      countryId: vipStores.countryId,
      stateId: vipStores.stateId,
      cityId: vipStores.cityId,
      phone: vipStores.phone,
      isActive: vipStores.isActive,
      isApproved: vipStores.isApproved,
      createdAt: vipStores.createdAt,
      updatedAt: vipStores.updatedAt,
      country: {
        id: countries.id,
        name: countries.name,
        nameEn: countries.nameEn,
        code: countries.code,
        currency: countries.currency,
        vipPrice: countries.vipPrice,
        paymentMethods: countries.paymentMethods,
        requiresTransferProof: countries.requiresTransferProof,
        isActive: countries.isActive,
        createdAt: countries.createdAt,
      },
      state: {
        id: states.id,
        name: states.name,
        nameEn: states.nameEn,
        countryId: states.countryId,
      },
      city: {
        id: cities.id,
        name: cities.name,
        nameEn: cities.nameEn,
        stateId: cities.stateId,
      },
      user: {
        username: users.username,
        isVip: users.isVip,
      }
    })
    .from(vipStores)
    .innerJoin(countries, eq(vipStores.countryId, countries.id))
    .innerJoin(states, eq(vipStores.stateId, states.id))
    .innerJoin(cities, eq(vipStores.cityId, cities.id))
    .innerJoin(users, eq(vipStores.userId, users.id))
    .where(eq(vipStores.id, id));

    return store;
  }

  async getUserVipStore(userId: string): Promise<VipStoreWithLocation | undefined> {
    const [store] = await db.select({
      id: vipStores.id,
      userId: vipStores.userId,
      storeName: vipStores.storeName,
      brandName: vipStores.brandName,
      specialty: vipStores.specialty,
      logo: vipStores.logo,
      banner: vipStores.banner,
      address: vipStores.address,
      countryId: vipStores.countryId,
      stateId: vipStores.stateId,
      cityId: vipStores.cityId,
      phone: vipStores.phone,
      isActive: vipStores.isActive,
      isApproved: vipStores.isApproved,
      createdAt: vipStores.createdAt,
      updatedAt: vipStores.updatedAt,
      country: {
        id: countries.id,
        name: countries.name,
        nameEn: countries.nameEn,
        code: countries.code,
        currency: countries.currency,
        vipPrice: countries.vipPrice,
        paymentMethods: countries.paymentMethods,
        requiresTransferProof: countries.requiresTransferProof,
        isActive: countries.isActive,
        createdAt: countries.createdAt,
      },
      state: {
        id: states.id,
        name: states.name,
        nameEn: states.nameEn,
        countryId: states.countryId,
      },
      city: {
        id: cities.id,
        name: cities.name,
        nameEn: cities.nameEn,
        stateId: cities.stateId,
      },
      user: {
        username: users.username,
        isVip: users.isVip,
      }
    })
    .from(vipStores)
    .innerJoin(countries, eq(vipStores.countryId, countries.id))
    .innerJoin(states, eq(vipStores.stateId, states.id))
    .innerJoin(cities, eq(vipStores.cityId, cities.id))
    .innerJoin(users, eq(vipStores.userId, users.id))
    .where(eq(vipStores.userId, userId));

    return store;
  }

  async createVipStore(insertStore: InsertVipStore): Promise<VipStore> {
    const [store] = await db.insert(vipStores).values(insertStore).returning();
    return store;
  }

  async updateVipStore(id: string, updates: Partial<VipStore>): Promise<VipStore | undefined> {
    const [store] = await db.update(vipStores)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(vipStores.id, id))
      .returning();
    return store;
  }

  async approveVipStore(id: string): Promise<boolean> {
    const result = await db.update(vipStores)
      .set({ isApproved: true, updatedAt: new Date() })
      .where(eq(vipStores.id, id));

    // Also update user VIP status
    if ((result.rowCount ?? 0) > 0) {
      const [store] = await db.select().from(vipStores).where(eq(vipStores.id, id));
      if (store) {
        await db.update(users)
          .set({ isVip: true })
          .where(eq(users.id, store.userId));
      }
    }

    return (result.rowCount ?? 0) > 0;
  }

  // VIP System - Orders
  async getVipOrders(): Promise<VipOrder[]> {
    return await db.select().from(vipOrders).orderBy(desc(vipOrders.createdAt));
  }

  async getVipOrder(id: string): Promise<VipOrder | undefined> {
    const [order] = await db.select().from(vipOrders).where(eq(vipOrders.id, id));
    return order;
  }

  async getUserVipOrders(userId: string): Promise<VipOrder[]> {
    return await db.select().from(vipOrders)
      .where(eq(vipOrders.userId, userId))
      .orderBy(desc(vipOrders.createdAt));
  }

  async createVipOrder(insertOrder: InsertVipOrder): Promise<VipOrder> {
    const [order] = await db.insert(vipOrders).values(insertOrder).returning();
    return order;
  }

  async updateVipOrder(id: string, updates: Partial<VipOrder>): Promise<VipOrder | undefined> {
    const [order] = await db.update(vipOrders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(vipOrders.id, id))
      .returning();
    return order;
  }

  // VIP System - Store Products
  async getStoreProducts(storeId: string): Promise<StoreProduct[]> {
    return await db.select().from(storeProducts)
      .where(eq(storeProducts.storeId, storeId))
      .orderBy(desc(storeProducts.createdAt));
  }

  async getStoreProduct(id: string): Promise<StoreProduct | undefined> {
    const [product] = await db.select().from(storeProducts).where(eq(storeProducts.id, id));
    return product;
  }

  async createStoreProduct(insertProduct: InsertStoreProduct): Promise<StoreProduct> {
    const [product] = await db.insert(storeProducts).values(insertProduct).returning();
    return product;
  }

  async updateStoreProduct(id: string, updates: Partial<StoreProduct>): Promise<StoreProduct | undefined> {
    const [product] = await db.update(storeProducts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(storeProducts.id, id))
      .returning();
    return product;
  }

  async deleteStoreProduct(id: string): Promise<boolean> {
    const result = await db.delete(storeProducts).where(eq(storeProducts.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();