import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Custom auth fields
  passwordHash: varchar("passwordHash", { length: 256 }),
  isActive: int("isActive").default(1).notNull(), // 1 = active, 0 = deactivated/pending
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Regions ──────────────────────────────────────────────────────────────────
export const regions = mysqlTable("regions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  category: mysqlEnum("category", ["international", "indian_state", "union_territory"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Region = typeof regions.$inferSelect;

// ─── Categories (Vendor / Client / Consultant — fixed system-level) ───────────
// These are fixed top-level categories seeded at startup. Users cannot create/delete them.
// Sub-categories under each are user-managed.
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["vendor", "client", "consultant"]).notNull(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;

// ─── Sub-categories (user-managed, scoped to a parent category) ───────────────
export const subcategories = mysqlTable("subcategories", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull().references(() => categories.id),
  name: varchar("name", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Subcategory = typeof subcategories.$inferSelect;

// ─── Contact Sources ──────────────────────────────────────────────────────────
export const contactSources = mysqlTable("contact_sources", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContactSource = typeof contactSources.$inferSelect;

// ─── Contacts ─────────────────────────────────────────────────────────────────
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  uploadedByUserId: int("uploadedByUserId").notNull().references(() => users.id),
  // Contact info from device
  firstName: varchar("firstName", { length: 128 }),
  lastName: varchar("lastName", { length: 128 }),
  displayName: varchar("displayName", { length: 256 }).notNull(),
  phoneNumbers: text("phoneNumbers"), // JSON array of strings
  emails: text("emails"),             // JSON array of strings
  // Metadata — category + subcategory for each type
  regionId: int("regionId").references(() => regions.id),
  // Vendor
  vendorCategoryId: int("vendorCategoryId").references(() => categories.id),
  vendorSubcategoryId: int("vendorSubcategoryId").references(() => subcategories.id),
  // Client
  clientCategoryId: int("clientCategoryId").references(() => categories.id),
  clientSubcategoryId: int("clientSubcategoryId").references(() => subcategories.id),
  // Consultant
  consultantCategoryId: int("consultantCategoryId").references(() => categories.id),
  consultantSubcategoryId: int("consultantSubcategoryId").references(() => subcategories.id),
  // Source & notes
  contactSourceId: int("contactSourceId").references(() => contactSources.id),
  notes: text("notes"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  action: mysqlEnum("action", ["upload", "edit", "delete", "create_subcategory", "delete_subcategory", "bulk_edit", "bulk_delete", "csv_import"]).notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: int("entityId"),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
