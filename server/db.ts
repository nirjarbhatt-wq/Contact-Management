import { and, desc, eq, ilike, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  auditLogs,
  clientSubcategories,
  clients,
  consultants,
  contactSources,
  contacts,
  regions,
  users,
  vendorSubcategories,
  vendors,
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

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function getAllRegions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(regions).orderBy(regions.category, regions.name);
}

export async function getAllVendors() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendors).orderBy(vendors.name);
}

export async function getVendorSubcategories(vendorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendorSubcategories).where(eq(vendorSubcategories.vendorId, vendorId)).orderBy(vendorSubcategories.name);
}

export async function getAllVendorSubcategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendorSubcategories).orderBy(vendorSubcategories.vendorId, vendorSubcategories.name);
}

export async function getAllClients() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clients).orderBy(clients.name);
}

export async function getClientSubcategories(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientSubcategories).where(eq(clientSubcategories.clientId, clientId)).orderBy(clientSubcategories.name);
}

export async function getAllClientSubcategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientSubcategories).orderBy(clientSubcategories.clientId, clientSubcategories.name);
}

export async function getAllConsultants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(consultants).orderBy(consultants.name);
}

export async function getAllContactSources() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contactSources).orderBy(contactSources.name);
}

// ─── Create Metadata Entities ─────────────────────────────────────────────────

export async function createVendor(name: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(vendors).values({ name });
  return { id: (result as any).insertId as number, name };
}

export async function createVendorSubcategory(vendorId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(vendorSubcategories).values({ vendorId, name });
  return { id: (result as any).insertId as number, vendorId, name };
}

export async function createClient(name: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(clients).values({ name });
  return { id: (result as any).insertId as number, name };
}

export async function createClientSubcategory(clientId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(clientSubcategories).values({ clientId, name });
  return { id: (result as any).insertId as number, clientId, name };
}

export async function createConsultant(name: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(consultants).values({ name });
  return { id: (result as any).insertId as number, name };
}

export async function deleteVendor(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(vendors).where(eq(vendors.id, id));
}

export async function deleteClient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(clients).where(eq(clients.id, id));
}

export async function deleteConsultant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(consultants).where(eq(consultants.id, id));
}

export async function deleteVendorSubcategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(vendorSubcategories).where(eq(vendorSubcategories.id, id));
}

export async function deleteClientSubcategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(clientSubcategories).where(eq(clientSubcategories.id, id));
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export type ContactFilters = {
  search?: string;
  regionId?: number;
  vendorId?: number;
  clientId?: number;
  consultantId?: number;
  contactSourceId?: number;
  uploadedByUserId?: number;
  page?: number;
  pageSize?: number;
};

export async function getContacts(filters: ContactFilters = {}) {
  const db = await getDb();
  if (!db) return { contacts: [], total: 0 };
  const { search, regionId, vendorId, clientId, consultantId, contactSourceId, uploadedByUserId, page = 1, pageSize = 20 } = filters;
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
  if (vendorId) conditions.push(eq(contacts.vendorId, vendorId));
  if (clientId) conditions.push(eq(contacts.clientId, clientId));
  if (consultantId) conditions.push(eq(contacts.consultantId, consultantId));
  if (contactSourceId) conditions.push(eq(contacts.contactSourceId, contactSourceId));
  if (uploadedByUserId) conditions.push(eq(contacts.uploadedByUserId, uploadedByUserId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const [rows, countResult] = await Promise.all([
    db.select({
      id: contacts.id,
      displayName: contacts.displayName,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      phoneNumbers: contacts.phoneNumbers,
      emails: contacts.emails,
      notes: contacts.notes,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
      uploadedByUserId: contacts.uploadedByUserId,
      regionId: contacts.regionId,
      vendorId: contacts.vendorId,
      vendorSubcategoryId: contacts.vendorSubcategoryId,
      clientId: contacts.clientId,
      clientSubcategoryId: contacts.clientSubcategoryId,
      consultantId: contacts.consultantId,
      contactSourceId: contacts.contactSourceId,
      regionName: regions.name,
      vendorName: vendors.name,
      clientName: clients.name,
      consultantName: consultants.name,
      sourceName: contactSources.name,
      uploaderName: users.name,
    })
      .from(contacts)
      .leftJoin(regions, eq(contacts.regionId, regions.id))
      .leftJoin(vendors, eq(contacts.vendorId, vendors.id))
      .leftJoin(clients, eq(contacts.clientId, clients.id))
      .leftJoin(consultants, eq(contacts.consultantId, consultants.id))
      .leftJoin(contactSources, eq(contacts.contactSourceId, contactSources.id))
      .leftJoin(users, eq(contacts.uploadedByUserId, users.id))
      .where(whereClause)
      .orderBy(desc(contacts.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(contacts).where(whereClause),
  ]);

  return { contacts: rows, total: Number(countResult[0]?.count ?? 0) };
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
  vendorId?: number;
  vendorSubcategoryId?: number;
  clientId?: number;
  clientSubcategoryId?: number;
  consultantId?: number;
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
  vendorId: number | null;
  vendorSubcategoryId: number | null;
  clientId: number | null;
  clientSubcategoryId: number | null;
  consultantId: number | null;
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
  action: "upload" | "edit" | "delete" | "create_vendor" | "create_client" | "create_consultant" | "create_subcategory";
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

export async function getReportByVendor() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    vendorId: contacts.vendorId,
    vendorName: vendors.name,
    count: sql<number>`count(*)`,
  })
    .from(contacts)
    .leftJoin(vendors, eq(contacts.vendorId, vendors.id))
    .groupBy(contacts.vendorId, vendors.name)
    .orderBy(desc(sql`count(*)`));
}

export async function getReportByVendorSubcategory() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    vendorSubcategoryId: contacts.vendorSubcategoryId,
    subcategoryName: vendorSubcategories.name,
    vendorName: vendors.name,
    count: sql<number>`count(*)`,
  })
    .from(contacts)
    .leftJoin(vendorSubcategories, eq(contacts.vendorSubcategoryId, vendorSubcategories.id))
    .leftJoin(vendors, eq(vendorSubcategories.vendorId, vendors.id))
    .groupBy(contacts.vendorSubcategoryId, vendorSubcategories.name, vendors.name)
    .orderBy(desc(sql`count(*)`));
}

export async function getReportByClient() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    clientId: contacts.clientId,
    clientName: clients.name,
    count: sql<number>`count(*)`,
  })
    .from(contacts)
    .leftJoin(clients, eq(contacts.clientId, clients.id))
    .groupBy(contacts.clientId, clients.name)
    .orderBy(desc(sql`count(*)`));
}

export async function getReportByClientSubcategory() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    clientSubcategoryId: contacts.clientSubcategoryId,
    subcategoryName: clientSubcategories.name,
    clientName: clients.name,
    count: sql<number>`count(*)`,
  })
    .from(contacts)
    .leftJoin(clientSubcategories, eq(contacts.clientSubcategoryId, clientSubcategories.id))
    .leftJoin(clients, eq(clientSubcategories.clientId, clients.id))
    .groupBy(contacts.clientSubcategoryId, clientSubcategories.name, clients.name)
    .orderBy(desc(sql`count(*)`));
}

export async function getReportByConsultant() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    consultantId: contacts.consultantId,
    consultantName: consultants.name,
    count: sql<number>`count(*)`,
  })
    .from(contacts)
    .leftJoin(consultants, eq(contacts.consultantId, consultants.id))
    .groupBy(contacts.consultantId, consultants.name)
    .orderBy(desc(sql`count(*)`));
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
  if (!db) return { totalContacts: 0, totalUsers: 0, totalVendors: 0, totalClients: 0 };
  const [contactCount, userCount, vendorCount, clientCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(contacts),
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(vendors),
    db.select({ count: sql<number>`count(*)` }).from(clients),
  ]);
  return {
    totalContacts: Number(contactCount[0]?.count ?? 0),
    totalUsers: Number(userCount[0]?.count ?? 0),
    totalVendors: Number(vendorCount[0]?.count ?? 0),
    totalClients: Number(clientCount[0]?.count ?? 0),
  };
}
