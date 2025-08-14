import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertAdSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";

// Configure multer for image uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: multerStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('صيغة الصورة غير مدعومة. يُرجى استخدام JPEG, PNG أو WebP'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
  }, (req, res, next) => {
    const filePath = path.join(uploadDir, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "الملف غير موجود" });
    }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب الفئات" });
    }
  });

  app.get("/api/categories/:id", async (req, res) => {
    try {
      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "الفئة غير موجودة" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب الفئة" });
    }
  });

  // Ads
  app.get("/api/ads", async (req, res) => {
    try {
      const filters = {
        categoryId: req.query.categoryId as string,
        location: req.query.location as string,
        minPrice: req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined,
        search: req.query.search as string,
      };

      const ads = await storage.getAds(filters);
      res.json(ads);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب الإعلانات" });
    }
  });

  app.get("/api/ads/featured", async (req, res) => {
    try {
      const ads = await storage.getFeaturedAds();
      res.json(ads);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب الإعلانات المميزة" });
    }
  });

  app.get("/api/ads/:id", async (req, res) => {
    try {
      const ad = await storage.getAd(req.params.id);
      if (!ad) {
        return res.status(404).json({ message: "الإعلان غير موجود" });
      }
      res.json(ad);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب الإعلان" });
    }
  });

  app.post("/api/ads", upload.array('images', 5), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const imageUrls = files ? files.map(file => `/uploads/${file.filename}`) : [];

      const adData = {
        title: req.body.title,
        description: req.body.description,
        price: req.body.price ? parseInt(req.body.price) : null,
        currency: req.body.currency || "ريال",
        categoryId: req.body.categoryId,
        userId: req.body.userId,
        location: req.body.location,
        phone: req.body.phone,
        email: req.body.email || null,
        images: imageUrls,
        isApproved: false, // All ads require approval
        isActive: true,
        isFeatured: false,
      };

      const validatedData = insertAdSchema.parse(adData);
      const ad = await storage.createAd(validatedData);
      
      res.status(201).json(ad);
    } catch (error) {
      console.error("Error creating ad:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في إنشاء الإعلان" });
    }
  });

  app.patch("/api/ads/:id", async (req, res) => {
    try {
      const updates = req.body;
      if (updates.price) {
        updates.price = parseInt(updates.price);
      }

      const ad = await storage.updateAd(req.params.id, updates);
      if (!ad) {
        return res.status(404).json({ message: "الإعلان غير موجود" });
      }

      res.json(ad);
    } catch (error) {
      res.status(500).json({ message: "خطأ في تحديث الإعلان" });
    }
  });

  app.delete("/api/ads/:id", async (req, res) => {
    try {
      const success = await storage.deleteAd(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "الإعلان غير موجود" });
      }

      res.json({ message: "تم حذف الإعلان بنجاح" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في حذف الإعلان" });
    }
  });

  // Users
  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      
      // Don't return password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في إنشاء المستخدم" });
    }
  });

  // Admin routes
  app.get("/api/admin/ads/pending", async (req, res) => {
    try {
      const ads = await storage.getPendingAds();
      res.json(ads);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب الإعلانات المعلقة" });
    }
  });

  app.patch("/api/admin/ads/:id/approve", async (req, res) => {
    try {
      const success = await storage.approveAd(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "الإعلان غير موجود" });
      }

      res.json({ message: "تم اعتماد الإعلان بنجاح" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في اعتماد الإعلان" });
    }
  });

  app.patch("/api/admin/ads/:id/reject", async (req, res) => {
    try {
      const success = await storage.rejectAd(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "الإعلان غير موجود" });
      }

      res.json({ message: "تم رفض الإعلان" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في رفض الإعلان" });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    try {
      const stats = await storage.getAdStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب الإحصائيات" });
    }
  });

  // VIP System APIs
  
  // Countries API
  app.get("/api/vip/countries", async (req, res) => {
    try {
      const countries = await storage.getCountries();
      res.json(countries);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب الدول" });
    }
  });

  // States API
  app.get("/api/vip/states/:countryId", async (req, res) => {
    try {
      const states = await storage.getStates(req.params.countryId);
      res.json(states);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب المحافظات" });
    }
  });

  // Cities API
  app.get("/api/vip/cities/:stateId", async (req, res) => {
    try {
      const cities = await storage.getCities(req.params.stateId);
      res.json(cities);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب المدن" });
    }
  });

  // VIP Stores API
  app.get("/api/vip/stores", async (req, res) => {
    try {
      const stores = await storage.getVipStores();
      res.json(stores);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب المتاجر" });
    }
  });

  app.get("/api/vip/stores/:id", async (req, res) => {
    try {
      const store = await storage.getVipStore(req.params.id);
      if (!store) {
        return res.status(404).json({ message: "المتجر غير موجود" });
      }
      res.json(store);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب المتجر" });
    }
  });

  app.post("/api/vip/stores", upload.fields([
    { name: 'logoFile', maxCount: 1 },
    { name: 'bannerFile', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const {
        name,
        phone,
        address,
        countryId,
        stateId,
        cityId,
        brandName,
        specialty
      } = req.body;

      // Handle uploaded files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const logoFile = files?.logoFile?.[0];
      const bannerFile = files?.bannerFile?.[0];

      // Create temporary user for now (this should be replaced with actual authentication)
      let tempUser;
      try {
        tempUser = await storage.createUser({
          username: name,
          email: `${name.toLowerCase().replace(/\s+/g, '_')}@temp.com`,
          password: "temp123",
          phone: phone,
        });
      } catch (error) {
        // User might already exist, try to find by phone
        const users = await storage.getCategories(); // This is a workaround - we need proper user search
        tempUser = { id: "temp-user-id" }; // Placeholder
      }

      const store = await storage.createVipStore({
        userId: tempUser.id,
        storeName: brandName,
        brandName: brandName,
        specialty: specialty,
        logo: logoFile ? `/uploads/${logoFile.filename}` : null,
        banner: bannerFile ? `/uploads/${bannerFile.filename}` : null,
        address: address,
        countryId: countryId,
        stateId: stateId,
        cityId: cityId,
        phone: phone,
        isActive: true,
        isApproved: false,
      });

      res.status(201).json(store);
    } catch (error) {
      console.error("Error creating VIP store:", error);
      res.status(500).json({ message: "خطأ في إنشاء المتجر" });
    }
  });

  // VIP Orders API
  app.get("/api/vip/orders", async (req, res) => {
    try {
      const orders = await storage.getVipOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب الطلبات" });
    }
  });

  app.post("/api/vip/orders", async (req, res) => {
    try {
      const {
        userId,
        storeId,
        countryId,
        amount,
        currency,
        paymentMethod,
        transferProofImage,
        stripePaymentId
      } = req.body;

      const order = await storage.createVipOrder({
        userId,
        storeId,
        countryId,
        amount: amount.toString(),
        currency,
        paymentMethod,
        transferProofImage,
        stripePaymentId,
        status: "pending",
        adminNotes: null,
      });

      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating VIP order:", error);
      res.status(500).json({ message: "خطأ في إنشاء الطلب" });
    }
  });

  // Admin VIP APIs
  app.get("/api/admin/vip/stores", async (req, res) => {
    try {
      const stores = await storage.getVipStores();
      res.json(stores);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب المتاجر" });
    }
  });

  app.patch("/api/admin/vip/stores/:id/approve", async (req, res) => {
    try {
      const success = await storage.approveVipStore(req.params.id);
      if (success) {
        res.json({ message: "تم اعتماد المتجر بنجاح" });
      } else {
        res.status(404).json({ message: "المتجر غير موجود" });
      }
    } catch (error) {
      res.status(500).json({ message: "خطأ في اعتماد المتجر" });
    }
  });

  app.get("/api/admin/vip/orders", async (req, res) => {
    try {
      const orders = await storage.getVipOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب طلبات VIP" });
    }
  });

  app.patch("/api/admin/vip/orders/:id", async (req, res) => {
    try {
      const { status, adminNotes } = req.body;
      const order = await storage.updateVipOrder(req.params.id, {
        status,
        adminNotes,
      });
      
      if (order) {
        res.json(order);
      } else {
        res.status(404).json({ message: "الطلب غير موجود" });
      }
    } catch (error) {
      res.status(500).json({ message: "خطأ في تحديث الطلب" });
    }
  });

  // Admin Countries Management
  app.get("/api/admin/countries", async (req, res) => {
    try {
      const countries = await storage.getCountries();
      res.json(countries);
    } catch (error) {
      res.status(500).json({ message: "خطأ في جلب الدول" });
    }
  });

  app.patch("/api/admin/countries/:id", async (req, res) => {
    try {
      const { vipPrice, paymentMethods, requiresTransferProof, isActive } = req.body;
      const country = await storage.updateCountry(req.params.id, {
        vipPrice,
        paymentMethods,
        requiresTransferProof,
        isActive,
      });
      
      if (country) {
        res.json(country);
      } else {
        res.status(404).json({ message: "الدولة غير موجودة" });
      }
    } catch (error) {
      res.status(500).json({ message: "خطأ في تحديث الدولة" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
