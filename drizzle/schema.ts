import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
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

// ─── Vendors ──────────────────────────────────────────────────────────────────
export const vendors = mysqlTable("vendors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Vendor = typeof vendors.$inferSelect;

export const vendorSubcategories = mysqlTable("vendor_subcategories", {
  id: int("id").autoincrement().primaryKey(),
  vendorId: int("vendorId").notNull().references(() => vendors.id),
  name: varchar("name", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VendorSubcategory = typeof vendorSubcategories.$inferSelect;

// ─── Clients ──────────────────────────────────────────────────────────────────
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Client = typeof clients.$inferSelect;

export const clientSubcategories = mysqlTable("client_subcategories", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => clients.id),
  name: varchar("name", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClientSubcategory = typeof clientSubcategories.$inferSelect;

// ─── Consultants ──────────────────────────────────────────────────────────────
export const consultants = mysqlTable("consultants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Consultant = typeof consultants.$inferSelect;

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
  // Metadata
  regionId: int("regionId").references(() => regions.id),
  vendorId: int("vendorId").references(() => vendors.id),
  vendorSubcategoryId: int("vendorSubcategoryId").references(() => vendorSubcategories.id),
  clientId: int("clientId").references(() => clients.id),
  clientSubcategoryId: int("clientSubcategoryId").references(() => clientSubcategories.id),
  consultantId: int("consultantId").references(() => consultants.id),
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
  action: mysqlEnum("action", ["upload", "edit", "delete", "create_vendor", "create_client", "create_consultant", "create_subcategory"]).notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(), // "contact", "vendor", etc.
  entityId: int("entityId"),
  details: text("details"), // JSON with before/after or description
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
