import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  auditLogs,
  categories,
  contactSources,
  contacts,
  regions,
  subcategories,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const f of textFields) {
    const v = user[f];
    if (v !== undefined) { values[f] = v ?? null; updateSet[f] = v ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Regions ──────────────────────────────────────────────────────────────────

export async function getAllRegions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(regions).orderBy(regions.category, regions.name);
}

// ─── Categories & Subcategories ───────────────────────────────────────────────
// Categories are fixed system-level: Vendor, Client, Consultant.
// Subcategories are user-managed under each category.

export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(categories.type, categories.name);
}

export async function getCategoryByType(type: "vendor" | "client" | "consultant") {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(eq(categories.type, type)).limit(1);
  return result[0];
}

export async function getAllSubcategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subcategories).orderBy(subcategories.categoryId, subcategories.name);
}

export async function getSubcategoriesByCategoryId(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subcategories).where(eq(subcategories.categoryId, categoryId)).orderBy(subcategories.name);
}

export async function createSubcategory(categoryId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(subcategories).values({ categoryId, name });
  return { id: (result as any).insertId as number, categoryId, name };
}

export async function deleteSubcategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(subcategories).where(eq(subcategories.id, id));
}

// ─── Contact Sources ──────────────────────────────────────────────────────────

export async function getAllContactSources() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contactSources).orderBy(contactSources.name);
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export type ContactFilters = {
  search?: string;
  regionId?: number;
  vendorSubcategoryId?: number;
  clientSubcategoryId?: number;
  consultantSubcategoryId?: number;
  contactSourceId?: number;
  uploadedByUserId?: number;
  page?: number;
  pageSize?: number;
};

// Alias tables for multiple joins on same table
const vendorSubcat = subcategories;
const clientSubcat = subcategories;
const consultantSubcat = subcategories;

export async function getContacts(filters: ContactFilters = {}) {
  const db = await getDb();
  if (!db) return { contacts: [], total: 0 };
  const {
    search, regionId, vendorSubcategoryId, clientSubcategoryId,
    consultantSubcategoryId, contactSourceId, uploadedByUserId,
    page = 1, pageSize = 20
  } = filters;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(contacts.displayName, `%${search}%`),
        like(contacts.phoneNumbers, `%${search}%`),
        like(contacts.emails, `%${search}%`)
      )
    );
  }
  if (regionId) conditions.push(eq(contacts.regionId, regionId));
  if (vendorSubcategoryId) conditions.push(eq(contacts.vendorSubcategoryId, vendorSubcategoryId));
  if (clientSubcategoryId) conditions.push(eq(contacts.clientSubcategoryId, clientSubcategoryId));
  if (consultantSubcategoryId) conditions.push(eq(contacts.consultantSubcategoryId, consultantSubcategoryId));
  if (contactSourceId) conditions.push(eq(contacts.contactSourceId, contactSourceId));
  if (uploadedByUserId) conditions.push(eq(contacts.uploadedByUserId, uploadedByUserId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  // Use raw SQL for multi-join on same table (subcategories)
  const [rows, countResult] = await Promise.all([
    db.execute(sql`
      SELECT
        c.id, c.displayName, c.firstName, c.lastName, c.phoneNumbers, c.emails, c.notes,
        c.createdAt, c.updatedAt, c.uploadedByUserId,
        c.regionId, c.vendorCategoryId, c.vendorSubcategoryId,
        c.clientCategoryId, c.clientSubcategoryId,
        c.consultantCategoryId, c.consultantSubcategoryId,
        c.contactSourceId,
        r.name AS regionName,
        vs.name AS vendorSubcategoryName,
        cs.name AS clientSubcategoryName,
        cts.name AS consultantSubcategoryName,
        src.name AS sourceName,
        u.name AS uploaderName
      FROM contacts c
      LEFT JOIN regions r ON c.regionId = r.id
      LEFT JOIN subcategories vs ON c.vendorSubcategoryId = vs.id
      LEFT JOIN subcategories cs ON c.clientSubcategoryId = cs.id
      LEFT JOIN subcategories cts ON c.consultantSubcategoryId = cts.id
      LEFT JOIN contact_sources src ON c.contactSourceId = src.id
      LEFT JOIN users u ON c.uploadedByUserId = u.id
      ${whereClause ? sql`WHERE ${whereClause}` : sql``}
      ORDER BY c.createdAt DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `),
    db.select({ count: sql<number>`count(*)` }).from(contacts).where(whereClause),
  ]);

  return { contacts: (rows as any[])[0] as any[], total: Number(countResult[0]?.count ?? 0) };
}

export async function getContactById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  return result[0];
}

export async function insertContact(data: {
  uploadedByUserId: number;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phoneNumbers?: string;
  emails?: string;
  regionId?: number;
  vendorCategoryId?: number;
  vendorSubcategoryId?: number;
  clientCategoryId?: number;
  clientSubcategoryId?: number;
  consultantCategoryId?: number;
  consultantSubcategoryId?: number;
  contactSourceId?: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(contacts).values(data);
  return (result as any).insertId as number;
}

export async function updateContact(id: number, data: Partial<{
  regionId: number | null;
  vendorCategoryId: number | null;
  vendorSubcategoryId: number | null;
  clientCategoryId: number | null;
  clientSubcategoryId: number | null;
  consultantCategoryId: number | null;
  consultantSubcategoryId: number | null;
  contactSourceId: number | null;
  notes: string | null;
}>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(contacts).set(data).where(eq(contacts.id, id));
}

export async function deleteContact(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(contacts).where(eq(contacts.id, id));
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export async function insertAuditLog(data: {
  userId: number;
  action: "upload" | "edit" | "delete" | "create_subcategory" | "delete_subcategory";
  entityType: string;
  entityId?: number;
  details?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(data);
}

export async function getAuditLogs(page = 1, pageSize = 50) {
  const db = await getDb();
  if (!db) return { logs: [], total: 0 };
  const offset = (page - 1) * pageSize;
  const [rows, countResult] = await Promise.all([
    db.select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      userId: auditLogs.userId,
      userName: users.name,
      userEmail: users.email,
    })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(auditLogs),
  ]);
  return { logs: rows, total: Number(countResult[0]?.count ?? 0) };
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function getReportByRegion() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    regionId: contacts.regionId,
    regionName: regions.name,
    count: sql<number>`count(*)`,
  })
    .from(contacts)
    .leftJoin(regions, eq(contacts.regionId, regions.id))
    .groupBy(contacts.regionId, regions.name)
    .orderBy(desc(sql`count(*)`));
}

export async function getReportByVendorSubcategory() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.execute(sql`
    SELECT s.id AS subcategoryId, s.name AS subcategoryName, COUNT(*) AS count
    FROM contacts c
    LEFT JOIN subcategories s ON c.vendorSubcategoryId = s.id
    WHERE c.vendorSubcategoryId IS NOT NULL
    GROUP BY s.id, s.name
    ORDER BY count DESC
  `);
  return (rows as any[])[0] as { subcategoryId: number; subcategoryName: string; count: number }[];
}

export async function getReportByClientSubcategory() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.execute(sql`
    SELECT s.id AS subcategoryId, s.name AS subcategoryName, COUNT(*) AS count
    FROM contacts c
    LEFT JOIN subcategories s ON c.clientSubcategoryId = s.id
    WHERE c.clientSubcategoryId IS NOT NULL
    GROUP BY s.id, s.name
    ORDER BY count DESC
  `);
  return (rows as any[])[0] as { subcategoryId: number; subcategoryName: string; count: number }[];
}

export async function getReportByConsultantSubcategory() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.execute(sql`
    SELECT s.id AS subcategoryId, s.name AS subcategoryName, COUNT(*) AS count
    FROM contacts c
    LEFT JOIN subcategories s ON c.consultantSubcategoryId = s.id
    WHERE c.consultantSubcategoryId IS NOT NULL
    GROUP BY s.id, s.name
    ORDER BY count DESC
  `);
  return (rows as any[])[0] as { subcategoryId: number; subcategoryName: string; count: number }[];
}

export async function getReportBySource() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    contactSourceId: contacts.contactSourceId,
    sourceName: contactSources.name,
    count: sql<number>`count(*)`,
  })
    .from(contacts)
    .leftJoin(contactSources, eq(contacts.contactSourceId, contactSources.id))
    .groupBy(contacts.contactSourceId, contactSources.name)
    .orderBy(desc(sql`count(*)`));
}

export async function getReportUploadActivity() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    date: sql<string>`DATE(${contacts.createdAt})`,
    count: sql<number>`count(*)`,
  })
    .from(contacts)
    .groupBy(sql`DATE(${contacts.createdAt})`)
    .orderBy(sql`DATE(${contacts.createdAt})`);
}

export async function getOverviewStats() {
  const db = await getDb();
  if (!db) return { totalContacts: 0, totalUsers: 0, totalSubcategories: 0 };
  const [contactCount, userCount, subcategoryCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(contacts),
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(subcategories),
  ]);
  return {
    totalContacts: Number(contactCount[0]?.count ?? 0),
    totalUsers: Number(userCount[0]?.count ?? 0),
    totalSubcategories: Number(subcategoryCount[0]?.count ?? 0),
  };
}
