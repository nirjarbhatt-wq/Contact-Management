import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createSubcategory,
  deleteSubcategory,
  deleteContact,
  getAuditLogs,
  getAllCategories,
  getAllContactSources,
  getAllRegions,
  getAllSubcategories,
  getCategoryByType,
  getContactById,
  getContacts,
  getOverviewStats,
  getReportByClientSubcategory,
  getReportByConsultantSubcategory,
  getReportByRegion,
  getReportBySource,
  getReportByVendorSubcategory,
  getReportUploadActivity,
  getDrilldownContacts,
  getSubcategoriesByCategoryId,
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
// Categories are fixed (Vendor, Client, Consultant). Only subcategories are user-managed.
const metadataRouter = router({
  getAll: protectedProcedure.query(async () => {
    const [regionList, categoryList, subcategoryList, sourceList] = await Promise.all([
      getAllRegions(),
      getAllCategories(),
      getAllSubcategories(),
      getAllContactSources(),
    ]);
    return {
      regions: regionList,
      categories: categoryList,
      subcategories: subcategoryList,
      contactSources: sourceList,
    };
  }),

  getSubcategoriesByCategoryId: protectedProcedure
    .input(z.object({ categoryId: z.number().int().positive() }))
    .query(({ input }) => getSubcategoriesByCategoryId(input.categoryId)),

  // Any user can create a subcategory under an existing category
  createSubcategory: protectedProcedure
    .input(z.object({
      categoryId: z.number().int().positive(),
      name: z.string().min(1).max(128),
    }))
    .mutation(async ({ ctx, input }) => {
      const sub = await createSubcategory(input.categoryId, input.name);
      await insertAuditLog({
        userId: ctx.user.id,
        action: "create_subcategory",
        entityType: "subcategory",
        entityId: sub.id,
        details: JSON.stringify({ categoryId: input.categoryId, name: input.name }),
      });
      return sub;
    }),

  // Admin-only: delete a subcategory
  deleteSubcategory: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteSubcategory(input.id);
      await insertAuditLog({
        userId: ctx.user.id,
        action: "delete_subcategory",
        entityType: "subcategory",
        entityId: input.id,
        details: JSON.stringify({ id: input.id }),
      });
      return { success: true };
    }),
});

// ─── Contacts Router ──────────────────────────────────────────────────────────
const contactsRouter = router({
  list: protectedProcedure.input(z.object({
    search: z.string().optional(),
    regionId: z.number().int().positive().optional(),
    vendorSubcategoryId: z.number().int().positive().optional(),
    clientSubcategoryId: z.number().int().positive().optional(),
    consultantSubcategoryId: z.number().int().positive().optional(),
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
    vendorCategoryId: z.number().int().positive().optional(),
    vendorSubcategoryId: z.number().int().positive().optional(),
    clientCategoryId: z.number().int().positive().optional(),
    clientSubcategoryId: z.number().int().positive().optional(),
    consultantCategoryId: z.number().int().positive().optional(),
    consultantSubcategoryId: z.number().int().positive().optional(),
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
        vendorCategoryId: c.vendorCategoryId,
        vendorSubcategoryId: c.vendorSubcategoryId,
        clientCategoryId: c.clientCategoryId,
        clientSubcategoryId: c.clientSubcategoryId,
        consultantCategoryId: c.consultantCategoryId,
        consultantSubcategoryId: c.consultantSubcategoryId,
        contactSourceId: c.contactSourceId,
        notes: c.notes,
      });
      ids.push(id);
      await insertAuditLog({
        userId: ctx.user.id,
        action: "upload",
        entityType: "contact",
        entityId: id,
        details: JSON.stringify({ displayName: c.displayName }),
      });
    }
    return { uploaded: ids.length, ids };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    regionId: z.number().int().positive().nullable().optional(),
    vendorCategoryId: z.number().int().positive().nullable().optional(),
    vendorSubcategoryId: z.number().int().positive().nullable().optional(),
    clientCategoryId: z.number().int().positive().nullable().optional(),
    clientSubcategoryId: z.number().int().positive().nullable().optional(),
    consultantCategoryId: z.number().int().positive().nullable().optional(),
    consultantSubcategoryId: z.number().int().positive().nullable().optional(),
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
    await insertAuditLog({
      userId: ctx.user.id,
      action: "edit",
      entityType: "contact",
      entityId: id,
      details: JSON.stringify(data),
    });
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const existing = await getContactById(input.id);
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (existing.uploadedByUserId !== ctx.user.id && ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    await deleteContact(input.id);
    await insertAuditLog({
      userId: ctx.user.id,
      action: "delete",
      entityType: "contact",
      entityId: input.id,
      details: JSON.stringify({ displayName: existing.displayName }),
    });
    return { success: true };
  }),
});

// ─── Reports Router ───────────────────────────────────────────────────────────
const reportsRouter = router({
  overview: protectedProcedure.query(() => getOverviewStats()),
  byRegion: protectedProcedure.query(() => getReportByRegion()),
  byVendorSubcategory: protectedProcedure.query(() => getReportByVendorSubcategory()),
  byClientSubcategory: protectedProcedure.query(() => getReportByClientSubcategory()),
  byConsultantSubcategory: protectedProcedure.query(() => getReportByConsultantSubcategory()),
  bySource: protectedProcedure.query(() => getReportBySource()),
  uploadActivity: protectedProcedure.query(() => getReportUploadActivity()),
  drilldown: protectedProcedure.input(z.object({
    filterType: z.enum(["region", "vendorSubcategory", "clientSubcategory", "consultantSubcategory", "source"]),
    filterId: z.number().int(),
  })).query(({ input }) => getDrilldownContacts(input.filterType, input.filterId)),
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
