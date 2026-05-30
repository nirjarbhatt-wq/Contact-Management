import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getContacts: vi.fn().mockResolvedValue({ contacts: [], total: 0 }),
  getContactById: vi.fn().mockResolvedValue(null),
  insertContact: vi.fn().mockResolvedValue({ id: 1 }),
  updateContact: vi.fn().mockResolvedValue(undefined),
  deleteContact: vi.fn().mockResolvedValue(undefined),
  insertAuditLog: vi.fn().mockResolvedValue(undefined),
  getAllRegions: vi.fn().mockResolvedValue([]),
  getAllVendors: vi.fn().mockResolvedValue([]),
  getAllVendorSubcategories: vi.fn().mockResolvedValue([]),
  getAllClients: vi.fn().mockResolvedValue([]),
  getAllClientSubcategories: vi.fn().mockResolvedValue([]),
  getAllConsultants: vi.fn().mockResolvedValue([]),
  getAllContactSources: vi.fn().mockResolvedValue([]),
  getVendorSubcategories: vi.fn().mockResolvedValue([]),
  getClientSubcategories: vi.fn().mockResolvedValue([]),
  createVendor: vi.fn().mockResolvedValue({ id: 10, name: "Test Vendor" }),
  createVendorSubcategory: vi.fn().mockResolvedValue({ id: 20, name: "Test Sub" }),
  createClient: vi.fn().mockResolvedValue({ id: 30, name: "Test Client" }),
  createClientSubcategory: vi.fn().mockResolvedValue({ id: 40, name: "Test Client Sub" }),
  createConsultant: vi.fn().mockResolvedValue({ id: 50, name: "Test Consultant" }),
  deleteVendor: vi.fn().mockResolvedValue(undefined),
  deleteVendorSubcategory: vi.fn().mockResolvedValue(undefined),
  deleteClient: vi.fn().mockResolvedValue(undefined),
  deleteClientSubcategory: vi.fn().mockResolvedValue(undefined),
  deleteConsultant: vi.fn().mockResolvedValue(undefined),
  getAuditLogs: vi.fn().mockResolvedValue({ logs: [], total: 0 }),
  getOverviewStats: vi.fn().mockResolvedValue({ totalContacts: 0, totalUsers: 0, totalVendors: 0, totalClients: 0 }),
  getReportByRegion: vi.fn().mockResolvedValue([]),
  getReportByVendor: vi.fn().mockResolvedValue([]),
  getReportByVendorSubcategory: vi.fn().mockResolvedValue([]),
  getReportByClient: vi.fn().mockResolvedValue([]),
  getReportByClientSubcategory: vi.fn().mockResolvedValue([]),
  getReportByConsultant: vi.fn().mockResolvedValue([]),
  getReportBySource: vi.fn().mockResolvedValue([]),
  getReportUploadActivity: vi.fn().mockResolvedValue([]),
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
    expect(result).toHaveProperty("vendors");
    expect(result).toHaveProperty("clients");
    expect(result).toHaveProperty("consultants");
    expect(result).toHaveProperty("contactSources");
  });
});

describe("metadata.createVendor", () => {
  it("creates a vendor for authenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.metadata.createVendor({ name: "Test Vendor" });
    expect(result).toHaveProperty("id");
    expect(result.name).toBe("Test Vendor");
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
