import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  // Contact CRUD
  getContacts: vi.fn().mockResolvedValue({ contacts: [], total: 0 }),
  getContactById: vi.fn().mockResolvedValue(null),
  insertContact: vi.fn().mockResolvedValue({ id: 1 }),
  updateContact: vi.fn().mockResolvedValue(undefined),
  deleteContact: vi.fn().mockResolvedValue(undefined),
  insertAuditLog: vi.fn().mockResolvedValue(undefined),
  // Metadata — new unified model
  getAllRegions: vi.fn().mockResolvedValue([]),
  getAllCategories: vi.fn().mockResolvedValue([
    { id: 1, type: "vendor", name: "Vendor", createdAt: new Date() },
    { id: 2, type: "client", name: "Client", createdAt: new Date() },
    { id: 3, type: "consultant", name: "Consultant", createdAt: new Date() },
  ]),
  getAllSubcategories: vi.fn().mockResolvedValue([]),
  getSubcategoriesByCategoryId: vi.fn().mockResolvedValue([]),
  getAllContactSources: vi.fn().mockResolvedValue([]),
  createSubcategory: vi.fn().mockResolvedValue({ id: 10, categoryId: 1, name: "Test Sub", createdAt: new Date() }),
  deleteSubcategory: vi.fn().mockResolvedValue(undefined),
  getCategoryByType: vi.fn().mockResolvedValue({ id: 1, type: "vendor", name: "Vendor", createdAt: new Date() }),
  // Reports
  getAuditLogs: vi.fn().mockResolvedValue({ logs: [], total: 0 }),
  getOverviewStats: vi.fn().mockResolvedValue({ totalContacts: 0, totalUsers: 0, totalSubcategories: 0 }),
  getReportByRegion: vi.fn().mockResolvedValue([]),
  getReportByVendorSubcategory: vi.fn().mockResolvedValue([]),
  getReportByClientSubcategory: vi.fn().mockResolvedValue([]),
  getReportByConsultantSubcategory: vi.fn().mockResolvedValue([]),
  getReportBySource: vi.fn().mockResolvedValue([]),
  getReportUploadActivity: vi.fn().mockResolvedValue([]),
  // Auth
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn().mockResolvedValue(null),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeCtx(role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────
describe("auth", () => {
  it("me returns null for unauthenticated user", async () => {
    const ctx: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as any, res: { clearCookie: vi.fn() } as any };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("me returns user for authenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("test@example.com");
  });

  it("logout clears session cookie", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});

// ─── Contacts Tests ───────────────────────────────────────────────────────────
describe("contacts.list", () => {
  it("returns paginated contacts for authenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.contacts.list({ page: 1, pageSize: 10 });
    expect(result).toHaveProperty("contacts");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.contacts)).toBe(true);
  });

  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const ctx: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as any, res: { clearCookie: vi.fn() } as any };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.contacts.list({ page: 1, pageSize: 10 })).rejects.toThrow();
  });
});

describe("contacts.upload", () => {
  it("uploads contacts for authenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.contacts.upload([{
      displayName: "John Doe",
      firstName: "John",
      lastName: "Doe",
      phoneNumbers: ["+91 98765 43210"],
      emails: ["john@example.com"],
    }]);
    expect(result).toHaveProperty("uploaded");
    expect(result.uploaded).toBe(1);
  });

  it("returns 0 uploaded for empty array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.contacts.upload([]);
    expect(result.uploaded).toBe(0);
  });
});

// ─── Metadata Tests ───────────────────────────────────────────────────────────
describe("metadata.getAll", () => {
  it("returns all metadata for authenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.metadata.getAll();
    expect(result).toHaveProperty("regions");
    expect(result).toHaveProperty("categories");
    expect(result).toHaveProperty("subcategories");
    expect(result).toHaveProperty("contactSources");
  });
});

describe("metadata.createSubcategory", () => {
  it("creates a subcategory for authenticated user", async () => {
    // categoryId 1 = Vendor (seeded in DB)
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.metadata.createSubcategory({ categoryId: 1, name: `TestSub-${Date.now()}` });
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name");
  });
});

// ─── Reports Tests ────────────────────────────────────────────────────────────
describe("reports.overview", () => {
  it("returns overview stats for authenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.reports.overview();
    expect(result).toHaveProperty("totalContacts");
  });
});

describe("reports.byRegion", () => {
  it("returns region breakdown", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.reports.byRegion();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Audit Tests ──────────────────────────────────────────────────────────────
describe("audit.list", () => {
  it("returns audit logs for admin user", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.audit.list({ page: 1, pageSize: 50 });
    expect(result).toHaveProperty("logs");
    expect(result).toHaveProperty("total");
  });

  it("throws FORBIDDEN for non-admin user", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.audit.list({ page: 1, pageSize: 50 })).rejects.toThrow();
  });
});
