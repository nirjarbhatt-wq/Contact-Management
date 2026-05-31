import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
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

// ─── Phonetic helpers (Soundex) ───────────────────────────────────────────────
// Simple JS Soundex for server-side phonetic matching
function soundex(name: string): string {
  if (!name) return "";
  const s = name.toUpperCase().replace(/[^A-Z]/g, "");
  if (!s) return "";
  const map: Record<string, string> = {
    B: "1", F: "1", P: "1", V: "1",
    C: "2", G: "2", J: "2", K: "2", Q: "2", S: "2", X: "2", Z: "2",
    D: "3", T: "3",
    L: "4",
    M: "5", N: "5",
    R: "6",
  };
  let code = s[0]!;
  let prev = map[s[0]!] ?? "0";
  for (let i = 1; i < s.length && code.length < 4; i++) {
    const c = map[s[i]!] ?? "0";
    if (c !== "0" && c !== prev) code += c;
    prev = c;
  }
  return code.padEnd(4, "0");
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

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive, department: users.department, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).orderBy(users.name);
}

// ─── Regions ──────────────────────────────────────────────────────────────────

export async function getAllRegions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(regions).orderBy(regions.category, regions.name);
}

// ─── Categories & Subcategories ───────────────────────────────────────────────

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
  // Department-based access: if set, only return contacts uploaded by users in this department
  department?: string | null;
  page?: number;
  pageSize?: number;
  phoneticSearch?: boolean;
};

export async function getContacts(filters: ContactFilters = {}) {
  const db = await getDb();
  if (!db) return { contacts: [], total: 0 };
  const {
    search, regionId, vendorSubcategoryId, clientSubcategoryId,
    consultantSubcategoryId, contactSourceId, uploadedByUserId,
    page = 1, pageSize = 20, phoneticSearch = false,
  } = filters;

  const conditions = [];

  // Department scope: join users table and filter by department when set
  const hasDeptFilter = filters.department != null;

  if (search) {
    if (phoneticSearch) {
      // Phonetic: fetch all names and filter in JS (small dataset ≤ 20 users)
      // We'll handle this as a post-filter below
    } else {
      conditions.push(
        or(
          like(contacts.displayName, `%${search}%`),
          like(contacts.phoneNumbers, `%${search}%`),
          like(contacts.emails, `%${search}%`)
        )
      );
    }
  }
  if (regionId) conditions.push(eq(contacts.regionId, regionId));
  if (vendorSubcategoryId) conditions.push(eq(contacts.vendorSubcategoryId, vendorSubcategoryId));
  if (clientSubcategoryId) conditions.push(eq(contacts.clientSubcategoryId, clientSubcategoryId));
  if (consultantSubcategoryId) conditions.push(eq(contacts.consultantSubcategoryId, consultantSubcategoryId));
  if (contactSourceId) conditions.push(eq(contacts.contactSourceId, contactSourceId));
  if (uploadedByUserId) conditions.push(eq(contacts.uploadedByUserId, uploadedByUserId));
  if (hasDeptFilter) {
    // Filter contacts to those uploaded by users in the same department
    conditions.push(
      sql`${contacts.uploadedByUserId} IN (SELECT id FROM users WHERE department = ${filters.department})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

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
      LIMIT ${phoneticSearch && search ? 9999 : pageSize} OFFSET ${phoneticSearch && search ? 0 : offset}
    `),
    db.select({ count: sql<number>`count(*)` }).from(contacts).where(whereClause),
  ]);

  let allRows = (rows as any[])[0] as any[];

  // Phonetic post-filter
  if (phoneticSearch && search) {
    const searchCode = soundex(search);
    const searchLower = search.toLowerCase();
    allRows = allRows.filter((r: any) => {
      const name: string = r.displayName ?? "";
      // Match if soundex matches OR if name contains search (case-insensitive)
      return soundex(name) === searchCode || name.toLowerCase().includes(searchLower);
    });
    const total = allRows.length;
    const paginated = allRows.slice(offset, offset + pageSize);
    return { contacts: paginated, total };
  }

  return { contacts: allRows, total: Number(countResult[0]?.count ?? 0) };
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

// ─── Duplicate Detection ──────────────────────────────────────────────────────

export type DuplicateCandidate = {
  id: number;
  displayName: string;
  phoneNumbers: string | null;
  emails: string | null;
  uploaderName: string | null;
  createdAt: Date;
};

export async function findDuplicates(phoneNumbers: string[], emails: string[]): Promise<DuplicateCandidate[]> {
  const db = await getDb();
  if (!db) return [];
  if (phoneNumbers.length === 0 && emails.length === 0) return [];

  // Build conditions: any phone or email overlap
  const phoneLikes = phoneNumbers.map(p => like(contacts.phoneNumbers, `%${p}%`));
  const emailLikes = emails.map(e => like(contacts.emails, `%${e}%`));
  const allConditions = [...phoneLikes, ...emailLikes];
  if (allConditions.length === 0) return [];

  const rows = await db.execute(sql`
    SELECT c.id, c.displayName, c.phoneNumbers, c.emails, c.createdAt, u.name AS uploaderName
    FROM contacts c
    LEFT JOIN users u ON c.uploadedByUserId = u.id
    WHERE ${or(...allConditions)}
    LIMIT 20
  `);
  return (rows as any[])[0] as DuplicateCandidate[];
}

// ─── Bulk Edit ────────────────────────────────────────────────────────────────

export async function bulkUpdateContacts(
  ids: number[],
  data: Partial<{
    regionId: number | null;
    vendorCategoryId: number | null;
    vendorSubcategoryId: number | null;
    clientCategoryId: number | null;
    clientSubcategoryId: number | null;
    consultantCategoryId: number | null;
    consultantSubcategoryId: number | null;
    contactSourceId: number | null;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (ids.length === 0) return 0;
  await db.update(contacts).set(data).where(inArray(contacts.id, ids));
  return ids.length;
}

export async function bulkDeleteContacts(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (ids.length === 0) return 0;
  await db.delete(contacts).where(inArray(contacts.id, ids));
  return ids.length;
}

// ─── CSV Import ───────────────────────────────────────────────────────────────

export async function importContactsFromCSV(
  rows: Array<{
    displayName: string;
    firstName?: string;
    lastName?: string;
    phoneNumbers?: string[];
    emails?: string[];
    regionId?: number;
    vendorCategoryId?: number;
    vendorSubcategoryId?: number;
    clientCategoryId?: number;
    clientSubcategoryId?: number;
    consultantCategoryId?: number;
    consultantSubcategoryId?: number;
    contactSourceId?: number;
    notes?: string;
  }>,
  uploadedByUserId: number
): Promise<{ inserted: number; skipped: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    try {
      await db.insert(contacts).values({
        uploadedByUserId,
        displayName: row.displayName,
        firstName: row.firstName,
        lastName: row.lastName,
        phoneNumbers: row.phoneNumbers ? JSON.stringify(row.phoneNumbers) : undefined,
        emails: row.emails ? JSON.stringify(row.emails) : undefined,
        regionId: row.regionId,
        vendorCategoryId: row.vendorCategoryId,
        vendorSubcategoryId: row.vendorSubcategoryId,
        clientCategoryId: row.clientCategoryId,
        clientSubcategoryId: row.clientSubcategoryId,
        consultantCategoryId: row.consultantCategoryId,
        consultantSubcategoryId: row.consultantSubcategoryId,
        contactSourceId: row.contactSourceId,
        notes: row.notes,
      });
      inserted++;
    } catch {
      skipped++;
    }
  }
  return { inserted, skipped };
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getDashboardStats(department?: string | null) {
  const db = await getDb();
  if (!db) return {
    totalContacts: 0, contactsThisWeek: 0, contactsThisMonth: 0,
    activeUsers: 0, topRegions: [], recentContacts: [], uploadsByUser: [],
  };

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Build department subquery clause for raw SQL
  const deptClause = department != null
    ? sql`AND c.uploadedByUserId IN (SELECT id FROM users WHERE department = ${department})`
    : sql``;
  const deptClauseNoAlias = department != null
    ? sql`AND uploadedByUserId IN (SELECT id FROM users WHERE department = ${department})`
    : sql``;
  const deptWhere = department != null
    ? sql`WHERE uploadedByUserId IN (SELECT id FROM users WHERE department = ${department})`
    : sql``;

  const [
    totalResult,
    weekResult,
    monthResult,
    activeUsersResult,
    topRegionsResult,
    recentResult,
    uploadsByUserResult,
    activityResult,
  ] = await Promise.all([
    db.execute(sql`SELECT COUNT(*) AS count FROM contacts c WHERE 1=1 ${deptClause}`),
    db.execute(sql`SELECT COUNT(*) AS count FROM contacts c WHERE c.createdAt >= ${weekAgo} ${deptClause}`),
    db.execute(sql`SELECT COUNT(*) AS count FROM contacts c WHERE c.createdAt >= ${monthAgo} ${deptClause}`),
    db.execute(sql`SELECT COUNT(DISTINCT c.uploadedByUserId) AS count FROM contacts c WHERE c.createdAt >= ${monthAgo} ${deptClause}`),
    db.execute(sql`
      SELECT r.name AS regionName, COUNT(*) AS count
      FROM contacts c LEFT JOIN regions r ON c.regionId = r.id
      WHERE c.regionId IS NOT NULL ${deptClause}
      GROUP BY r.name ORDER BY count DESC LIMIT 5
    `),
    db.execute(sql`
      SELECT c.id, c.displayName, c.phoneNumbers, c.createdAt, u.name AS uploaderName
      FROM contacts c LEFT JOIN users u ON c.uploadedByUserId = u.id
      WHERE 1=1 ${deptClause}
      ORDER BY c.createdAt DESC LIMIT 10
    `),
    db.execute(sql`
      SELECT u.name AS userName, COUNT(*) AS count
      FROM contacts c LEFT JOIN users u ON c.uploadedByUserId = u.id
      WHERE 1=1 ${deptClause}
      GROUP BY u.id, u.name ORDER BY count DESC LIMIT 10
    `),
    db.execute(sql`
      SELECT DATE(createdAt) AS date, COUNT(*) AS count
      FROM contacts
      ${deptWhere} ${department != null ? sql`AND createdAt >= ${monthAgo}` : sql`WHERE createdAt >= ${monthAgo}`}
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `),
  ]);

  return {
    totalContacts: Number(((totalResult as any[])[0] as any[])[0]?.count ?? 0),
    contactsThisWeek: Number(((weekResult as any[])[0] as any[])[0]?.count ?? 0),
    contactsThisMonth: Number(((monthResult as any[])[0] as any[])[0]?.count ?? 0),
    activeUsers: Number(((activeUsersResult as any[])[0] as any[])[0]?.count ?? 0),
    topRegions: ((topRegionsResult as any[])[0] as any[]).map((r: any) => ({ name: r.regionName ?? "Unknown", count: Number(r.count) })),
    recentContacts: ((recentResult as any[])[0] as any[]),
    uploadsByUser: ((uploadsByUserResult as any[])[0] as any[]).map((r: any) => ({ name: r.userName ?? "Unknown", count: Number(r.count) })),
    uploadActivity: ((activityResult as any[])[0] as any[]).map((r: any) => ({ date: String(r.date), count: Number(r.count) })),
  };
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export async function insertAuditLog(data: {
  userId: number;
  action: "upload" | "edit" | "delete" | "create_subcategory" | "delete_subcategory" | "bulk_edit" | "bulk_delete" | "csv_import";
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

export async function getReportByRegion(department?: string | null) {
  const db = await getDb();
  if (!db) return [];
  const deptClause = department != null
    ? sql`AND c.uploadedByUserId IN (SELECT id FROM users WHERE department = ${department})`
    : sql``;
  const rows = await db.execute(sql`
    SELECT r.id AS regionId, r.name AS regionName, COUNT(*) AS count
    FROM contacts c LEFT JOIN regions r ON c.regionId = r.id
    WHERE c.regionId IS NOT NULL ${deptClause}
    GROUP BY r.id, r.name ORDER BY count DESC
  `);
  return (rows as any[])[0] as { regionId: number; regionName: string; count: number }[];
}

export async function getReportByVendorSubcategory(department?: string | null) {
  const db = await getDb();
  if (!db) return [];
  const deptClause = department != null
    ? sql`AND c.uploadedByUserId IN (SELECT id FROM users WHERE department = ${department})`
    : sql``;
  const rows = await db.execute(sql`
    SELECT s.id AS subcategoryId, s.name AS subcategoryName, COUNT(*) AS count
    FROM contacts c LEFT JOIN subcategories s ON c.vendorSubcategoryId = s.id
    WHERE c.vendorSubcategoryId IS NOT NULL ${deptClause}
    GROUP BY s.id, s.name ORDER BY count DESC
  `);
  return (rows as any[])[0] as { subcategoryId: number; subcategoryName: string; count: number }[];
}

export async function getReportByClientSubcategory(department?: string | null) {
  const db = await getDb();
  if (!db) return [];
  const deptClause = department != null
    ? sql`AND c.uploadedByUserId IN (SELECT id FROM users WHERE department = ${department})`
    : sql``;
  const rows = await db.execute(sql`
    SELECT s.id AS subcategoryId, s.name AS subcategoryName, COUNT(*) AS count
    FROM contacts c LEFT JOIN subcategories s ON c.clientSubcategoryId = s.id
    WHERE c.clientSubcategoryId IS NOT NULL ${deptClause}
    GROUP BY s.id, s.name ORDER BY count DESC
  `);
  return (rows as any[])[0] as { subcategoryId: number; subcategoryName: string; count: number }[];
}

export async function getReportByConsultantSubcategory(department?: string | null) {
  const db = await getDb();
  if (!db) return [];
  const deptClause = department != null
    ? sql`AND c.uploadedByUserId IN (SELECT id FROM users WHERE department = ${department})`
    : sql``;
  const rows = await db.execute(sql`
    SELECT s.id AS subcategoryId, s.name AS subcategoryName, COUNT(*) AS count
    FROM contacts c LEFT JOIN subcategories s ON c.consultantSubcategoryId = s.id
    WHERE c.consultantSubcategoryId IS NOT NULL ${deptClause}
    GROUP BY s.id, s.name ORDER BY count DESC
  `);
  return (rows as any[])[0] as { subcategoryId: number; subcategoryName: string; count: number }[];
}

export async function getReportBySource(department?: string | null) {
  const db = await getDb();
  if (!db) return [];
  const deptClause = department != null
    ? sql`AND c.uploadedByUserId IN (SELECT id FROM users WHERE department = ${department})`
    : sql``;
  const rows = await db.execute(sql`
    SELECT src.id AS contactSourceId, src.name AS sourceName, COUNT(*) AS count
    FROM contacts c LEFT JOIN contact_sources src ON c.contactSourceId = src.id
    WHERE c.contactSourceId IS NOT NULL ${deptClause}
    GROUP BY src.id, src.name ORDER BY count DESC
  `);
  return (rows as any[])[0] as { contactSourceId: number; sourceName: string; count: number }[];
}

export async function getReportUploadActivity(department?: string | null) {
  const db = await getDb();
  if (!db) return [];
  const deptClause = department != null
    ? sql`AND uploadedByUserId IN (SELECT id FROM users WHERE department = ${department})`
    : sql``;
  const rows = await db.execute(sql`
    SELECT DATE(createdAt) AS date, COUNT(*) AS count
    FROM contacts
    WHERE 1=1 ${deptClause}
    GROUP BY DATE(createdAt)
    ORDER BY DATE(createdAt)
  `);
  return (rows as any[])[0] as { date: string; count: number }[];
}

export async function getOverviewStats(department?: string | null) {
  const db = await getDb();
  if (!db) return { totalContacts: 0, totalUsers: 0, totalSubcategories: 0 };
  const deptClause = department != null
    ? sql`AND uploadedByUserId IN (SELECT id FROM users WHERE department = ${department})`
    : sql``;
  const [contactResult, userCount, subcategoryCount] = await Promise.all([
    db.execute(sql`SELECT COUNT(*) AS count FROM contacts WHERE 1=1 ${deptClause}`),
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(subcategories),
  ]);
  return {
    totalContacts: Number(((contactResult as any[])[0] as any[])[0]?.count ?? 0),
    totalUsers: Number(userCount[0]?.count ?? 0),
    totalSubcategories: Number(subcategoryCount[0]?.count ?? 0),
  };
}

export async function getDrilldownContacts(
  filterType: "region" | "vendorSubcategory" | "clientSubcategory" | "consultantSubcategory" | "source",
  filterId: number,
  department?: string | null
) {
  const db = await getDb();
  if (!db) return [];
  const colMap = {
    region: contacts.regionId,
    vendorSubcategory: contacts.vendorSubcategoryId,
    clientSubcategory: contacts.clientSubcategoryId,
    consultantSubcategory: contacts.consultantSubcategoryId,
    source: contacts.contactSourceId,
  } as const;
  const col = colMap[filterType];
  const deptCondition = department != null
    ? sql`AND ${contacts.uploadedByUserId} IN (SELECT id FROM users WHERE department = ${department})`
    : sql``;
  const rows = await db.execute(sql`
    SELECT id, displayName, firstName, lastName, phoneNumbers, emails, notes, createdAt
    FROM contacts
    WHERE ${col} = ${filterId} ${deptCondition}
    ORDER BY displayName
    LIMIT 200
  `);
  return (rows as any[])[0] as any[];
}

// ─── Custom Auth Helpers ──────────────────────────────────────────────────────

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] ?? null;
}

export async function createUser(data: { openId: string; name: string; email: string; passwordHash: string; role?: 'user' | 'admin'; isActive?: number; department?: string }) {
  const db = await getDb();
  if (!db) throw new Error('DB unavailable');
  await db.insert(users).values({
    openId: data.openId,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: 'password',
    role: data.role ?? 'user',
    isActive: data.isActive ?? 0,
    department: data.department,
    lastSignedIn: new Date(),
  });
  const result = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
  return result[0];
}

export async function setUserActive(userId: number, isActive: number) {
  const db = await getDb();
  if (!db) throw new Error('DB unavailable');
  await db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function setUserRole(userId: number, role: 'user' | 'admin') {
  const db = await getDb();
  if (!db) throw new Error('DB unavailable');
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error('DB unavailable');
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
}
