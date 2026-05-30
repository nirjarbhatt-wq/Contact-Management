import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createClient,
  createClientSubcategory,
  createConsultant,
  createVendor,
  createVendorSubcategory,
  deleteClient,
  deleteClientSubcategory,
  deleteConsultant,
  deleteContact,
  deleteVendor,
  deleteVendorSubcategory,
  getAuditLogs,
  getAllClientSubcategories,
  getAllClients,
  getAllConsultants,
  getAllContactSources,
  getAllRegions,
  getAllVendorSubcategories,
  getAllVendors,
  getClientSubcategories,
  getContactById,
  getContacts,
  getOverviewStats,
  getReportByClient,
  getReportByClientSubcategory,
  getReportByConsultant,
  getReportByRegion,
  getReportBySource,
  getReportByVendor,
  getReportByVendorSubcategory,
  getReportUploadActivity,
  getVendorSubcategories,
  insertAuditLog,
  insertContact,
  updateContact,
} from "./db";

// ─── Admin guard ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return next({ ctx });
});

// ─── Metadata Router ──────────────────────────────────────────────────────────
const metadataRouter = router({
  getAll: protectedProcedure.query(async () => {
    const [regionList, vendorList, vendorSubList, clientList, clientSubList, consultantList, sourceList] = await Promise.all([
      getAllRegions(),
      getAllVendors(),
      getAllVendorSubcategories(),
      getAllClients(),
      getAllClientSubcategories(),
      getAllConsultants(),
      getAllContactSources(),
    ]);
    return {
      regions: regionList,
      vendors: vendorList,
      vendorSubcategories: vendorSubList,
      clients: clientList,
      clientSubcategories: clientSubList,
      consultants: consultantList,
      contactSources: sourceList,
    };
  }),

  createVendor: protectedProcedure.input(z.object({ name: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
    const vendor = await createVendor(input.name);
    await insertAuditLog({ userId: ctx.user.id, action: "create_vendor", entityType: "vendor", entityId: vendor.id, details: JSON.stringify({ name: input.name }) });
    return vendor;
  }),

  createVendorSubcategory: protectedProcedure.input(z.object({ vendorId: z.number().int().positive(), name: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
    const sub = await createVendorSubcategory(input.vendorId, input.name);
    await insertAuditLog({ userId: ctx.user.id, action: "create_subcategory", entityType: "vendor_subcategory", entityId: sub.id, details: JSON.stringify({ vendorId: input.vendorId, name: input.name }) });
    return sub;
  }),

  createClient: protectedProcedure.input(z.object({ name: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
    const client = await createClient(input.name);
    await insertAuditLog({ userId: ctx.user.id, action: "create_client", entityType: "client", entityId: client.id, details: JSON.stringify({ name: input.name }) });
    return client;
  }),

  createClientSubcategory: protectedProcedure.input(z.object({ clientId: z.number().int().positive(), name: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
    const sub = await createClientSubcategory(input.clientId, input.name);
    await insertAuditLog({ userId: ctx.user.id, action: "create_subcategory", entityType: "client_subcategory", entityId: sub.id, details: JSON.stringify({ clientId: input.clientId, name: input.name }) });
    return sub;
  }),

  createConsultant: protectedProcedure.input(z.object({ name: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
    const consultant = await createConsultant(input.name);
    await insertAuditLog({ userId: ctx.user.id, action: "create_consultant", entityType: "consultant", entityId: consultant.id, details: JSON.stringify({ name: input.name }) });
    return consultant;
  }),

  // Admin-only delete operations
  deleteVendor: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await deleteVendor(input.id);
    return { success: true };
  }),

  deleteVendorSubcategory: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await deleteVendorSubcategory(input.id);
    return { success: true };
  }),

  deleteClient: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await deleteClient(input.id);
    return { success: true };
  }),

  deleteClientSubcategory: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await deleteClientSubcategory(input.id);
    return { success: true };
  }),

  deleteConsultant: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await deleteConsultant(input.id);
    return { success: true };
  }),
});

// ─── Contacts Router ──────────────────────────────────────────────────────────
const contactsRouter = router({
  list: protectedProcedure.input(z.object({
    search: z.string().optional(),
    regionId: z.number().int().positive().optional(),
    vendorId: z.number().int().positive().optional(),
    clientId: z.number().int().positive().optional(),
    consultantId: z.number().int().positive().optional(),
    contactSourceId: z.number().int().positive().optional(),
    myUploadsOnly: z.boolean().optional(),
    page: z.number().int().positive().default(1),
    pageSize: z.number().int().positive().max(100).default(20),
  })).query(async ({ ctx, input }) => {
    const filters = {
      ...input,
      uploadedByUserId: input.myUploadsOnly ? ctx.user.id : undefined,
    };
    return getContacts(filters);
  }),

  upload: protectedProcedure.input(z.array(z.object({
    displayName: z.string().min(1),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phoneNumbers: z.array(z.string()).optional(),
    emails: z.array(z.string()).optional(),
    regionId: z.number().int().positive().optional(),
    vendorId: z.number().int().positive().optional(),
    vendorSubcategoryId: z.number().int().positive().optional(),
    clientId: z.number().int().positive().optional(),
    clientSubcategoryId: z.number().int().positive().optional(),
    consultantId: z.number().int().positive().optional(),
    contactSourceId: z.number().int().positive().optional(),
    notes: z.string().optional(),
  }))).mutation(async ({ ctx, input }) => {
    const ids: number[] = [];
    for (const c of input) {
      const id = await insertContact({
        uploadedByUserId: ctx.user.id,
        displayName: c.displayName,
        firstName: c.firstName,
        lastName: c.lastName,
        phoneNumbers: c.phoneNumbers ? JSON.stringify(c.phoneNumbers) : undefined,
        emails: c.emails ? JSON.stringify(c.emails) : undefined,
        regionId: c.regionId,
        vendorId: c.vendorId,
        vendorSubcategoryId: c.vendorSubcategoryId,
        clientId: c.clientId,
        clientSubcategoryId: c.clientSubcategoryId,
        consultantId: c.consultantId,
        contactSourceId: c.contactSourceId,
        notes: c.notes,
      });
      ids.push(id);
      await insertAuditLog({ userId: ctx.user.id, action: "upload", entityType: "contact", entityId: id, details: JSON.stringify({ displayName: c.displayName }) });
    }
    return { uploaded: ids.length, ids };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    regionId: z.number().int().positive().nullable().optional(),
    vendorId: z.number().int().positive().nullable().optional(),
    vendorSubcategoryId: z.number().int().positive().nullable().optional(),
    clientId: z.number().int().positive().nullable().optional(),
    clientSubcategoryId: z.number().int().positive().nullable().optional(),
    consultantId: z.number().int().positive().nullable().optional(),
    contactSourceId: z.number().int().positive().nullable().optional(),
    notes: z.string().nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    const existing = await getContactById(input.id);
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (existing.uploadedByUserId !== ctx.user.id && ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const { id, ...data } = input;
    await updateContact(id, data);
    await insertAuditLog({ userId: ctx.user.id, action: "edit", entityType: "contact", entityId: id, details: JSON.stringify(data) });
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const existing = await getContactById(input.id);
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (existing.uploadedByUserId !== ctx.user.id && ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    await deleteContact(input.id);
    await insertAuditLog({ userId: ctx.user.id, action: "delete", entityType: "contact", entityId: input.id, details: JSON.stringify({ displayName: existing.displayName }) });
    return { success: true };
  }),
});

// ─── Reports Router ───────────────────────────────────────────────────────────
const reportsRouter = router({
  overview: protectedProcedure.query(() => getOverviewStats()),
  byRegion: protectedProcedure.query(() => getReportByRegion()),
  byVendor: protectedProcedure.query(() => getReportByVendor()),
  byVendorSubcategory: protectedProcedure.query(() => getReportByVendorSubcategory()),
  byClient: protectedProcedure.query(() => getReportByClient()),
  byClientSubcategory: protectedProcedure.query(() => getReportByClientSubcategory()),
  byConsultant: protectedProcedure.query(() => getReportByConsultant()),
  bySource: protectedProcedure.query(() => getReportBySource()),
  uploadActivity: protectedProcedure.query(() => getReportUploadActivity()),
});

// ─── Audit Router ─────────────────────────────────────────────────────────────
const auditRouter = router({
  list: adminProcedure.input(z.object({
    page: z.number().int().positive().default(1),
    pageSize: z.number().int().positive().max(100).default(50),
  })).query(({ input }) => getAuditLogs(input.page, input.pageSize)),
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  metadata: metadataRouter,
  contacts: contactsRouter,
  reports: reportsRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
