import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for admin authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isVip: boolean("is_vip").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Countries table for payment management
export const countries = pgTable("countries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  code: text("code").notNull().unique(), // e.g., "EG", "SA", "AE"
  currency: text("currency").notNull(), // e.g., "EGP", "SAR", "AED"
  vipPrice: decimal("vip_price", { precision: 10, scale: 2 }).notNull(), // VIP subscription price
  paymentMethods: jsonb("payment_methods").default([]), // ["bank_transfer", "stripe", "paypal"]
  requiresTransferProof: boolean("requires_transfer_proof").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// States/Provinces table
export const states = pgTable("states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  countryId: varchar("country_id").references(() => countries.id).notNull(),
});

// Cities table
export const cities = pgTable("cities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  stateId: varchar("state_id").references(() => states.id).notNull(),
});

// VIP Stores table
export const vipStores = pgTable("vip_stores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  storeName: text("store_name").notNull(),
  brandName: text("brand_name").notNull(),
  specialty: text("specialty").notNull(), // Store specialization
  logo: text("logo"), // Logo image path
  banner: text("banner"), // Banner image path
  address: text("address").notNull(),
  countryId: varchar("country_id").references(() => countries.id).notNull(),
  stateId: varchar("state_id").references(() => states.id).notNull(),
  cityId: varchar("city_id").references(() => cities.id).notNull(),
  phone: text("phone").notNull(),
  isActive: boolean("is_active").default(true),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// VIP Subscriptions/Orders table
export const vipOrders = pgTable("vip_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  storeId: varchar("store_id").references(() => vipStores.id).notNull(),
  countryId: varchar("country_id").references(() => countries.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  paymentMethod: text("payment_method").notNull(), // "bank_transfer", "stripe", etc.
  transferProofImage: text("transfer_proof_image"), // For bank transfers
  stripePaymentId: text("stripe_payment_id"), // For Stripe payments
  status: text("status").default("pending"), // "pending", "paid", "approved", "rejected"
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Store Products table
export const storeProducts = pgTable("store_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").references(() => vipStores.id).notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("ريال"),
  images: text("images").array().default([]),
  category: text("category"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  description: text("description"),
});

export const ads = pgTable("ads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price"),
  currency: text("currency").default("ريال"),
  categoryId: varchar("category_id").references(() => categories.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  location: text("location").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  images: text("images").array().default([]),
  isFeatured: boolean("is_featured").default(false),
  isApproved: boolean("is_approved").default(false),
  isActive: boolean("is_active").default(true),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(users, ({ one, many }) => ({
  ads: many(ads),
  vipStore: one(vipStores, { fields: [users.id], references: [vipStores.userId] }),
  vipOrders: many(vipOrders),
}));

export const countriesRelations = relations(countries, ({ many }) => ({
  states: many(states),
  vipStores: many(vipStores),
  vipOrders: many(vipOrders),
}));

export const statesRelations = relations(states, ({ one, many }) => ({
  country: one(countries, { fields: [states.countryId], references: [countries.id] }),
  cities: many(cities),
  vipStores: many(vipStores),
}));

export const citiesRelations = relations(cities, ({ one, many }) => ({
  state: one(states, { fields: [cities.stateId], references: [states.id] }),
  vipStores: many(vipStores),
}));

export const vipStoresRelations = relations(vipStores, ({ one, many }) => ({
  user: one(users, { fields: [vipStores.userId], references: [users.id] }),
  country: one(countries, { fields: [vipStores.countryId], references: [countries.id] }),
  state: one(states, { fields: [vipStores.stateId], references: [states.id] }),
  city: one(cities, { fields: [vipStores.cityId], references: [cities.id] }),
  products: many(storeProducts),
  vipOrders: many(vipOrders),
}));

export const vipOrdersRelations = relations(vipOrders, ({ one }) => ({
  user: one(users, { fields: [vipOrders.userId], references: [users.id] }),
  store: one(vipStores, { fields: [vipOrders.storeId], references: [vipStores.id] }),
  country: one(countries, { fields: [vipOrders.countryId], references: [countries.id] }),
}));

export const storeProductsRelations = relations(storeProducts, ({ one }) => ({
  store: one(vipStores, { fields: [storeProducts.storeId], references: [vipStores.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertAdSchema = createInsertSchema(ads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  views: true,
}).extend({
  email: z.string().email().optional().or(z.literal("")).or(z.null()),
  price: z.number().optional().or(z.null()),
  currency: z.string().optional().or(z.null()),
  images: z.array(z.string()).optional().or(z.null()),
});

export const insertCountrySchema = createInsertSchema(countries).omit({
  id: true,
  createdAt: true,
});

export const insertStateSchema = createInsertSchema(states).omit({
  id: true,
});

export const insertCitySchema = createInsertSchema(cities).omit({
  id: true,
});

export const insertVipStoreSchema = createInsertSchema(vipStores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  phone: z.string().min(1, "رقم الهاتف مطلوب"),
  address: z.string().min(1, "العنوان مطلوب"),
});

export const insertVipOrderSchema = createInsertSchema(vipOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStoreProductSchema = createInsertSchema(storeProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertAd = z.infer<typeof insertAdSchema>;
export type Ad = typeof ads.$inferSelect;

export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type Country = typeof countries.$inferSelect;

export type InsertState = z.infer<typeof insertStateSchema>;
export type State = typeof states.$inferSelect;

export type InsertCity = z.infer<typeof insertCitySchema>;
export type City = typeof cities.$inferSelect;

export type InsertVipStore = z.infer<typeof insertVipStoreSchema>;
export type VipStore = typeof vipStores.$inferSelect;

export type InsertVipOrder = z.infer<typeof insertVipOrderSchema>;
export type VipOrder = typeof vipOrders.$inferSelect;

export type InsertStoreProduct = z.infer<typeof insertStoreProductSchema>;
export type StoreProduct = typeof storeProducts.$inferSelect;

export type AdWithCategory = Ad & { category: Category; user: Pick<User, 'username'> };
export type VipStoreWithLocation = VipStore & { 
  country: Country; 
  state: State; 
  city: City; 
  user: Pick<User, 'username' | 'isVip'> 
};
