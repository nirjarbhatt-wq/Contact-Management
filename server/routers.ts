import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  bulkDeleteContacts,
  bulkUpdateContacts,
  createSubcategory,
  deleteContact,
  deleteSubcategory,
  findDuplicates,
  getAuditLogs,
  getAllCategories,
  getAllContactSources,
  getAllRegions,
  getAllSubcategories,
  getAllUsers,
  getCategoryByType,
  getContactById,
  getContacts,
  getDashboardStats,
  getDrilldownContacts,
  getOverviewStats,
  getReportByClientSubcategory,
  getReportByConsultantSubcategory,
  getReportByRegion,
  getReportBySource,
  getReportByVendorSubcategory,
  getReportUploadActivity,
  getSubcategoriesByCategoryId,
  importContactsFromCSV,
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
    phoneticSearch: z.boolean().optional(),
  })).query(async ({ ctx, input }) => {
    const filters = {
      ...input,
      uploadedByUserId: input.myUploadsOnly ? ctx.user.id : undefined,
    };
    return getContacts(filters);
  }),

  // Export all contacts without pagination — for CSV download
  exportAll: protectedProcedure.query(async () => {
    const result = await getContacts({ page: 1, pageSize: 5000 });
    return result.contacts;
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

  // ── New Phase 3 procedures ─────────────────────────────────────────────────

  checkDuplicates: protectedProcedure.input(z.object({
    phoneNumbers: z.array(z.string()),
    emails: z.array(z.string()),
  })).query(({ input }) => findDuplicates(input.phoneNumbers, input.emails)),

  bulkUpdate: protectedProcedure.input(z.object({
    ids: z.array(z.number().int().positive()).min(1),
    regionId: z.number().int().positive().nullable().optional(),
    vendorCategoryId: z.number().int().positive().nullable().optional(),
    vendorSubcategoryId: z.number().int().positive().nullable().optional(),
    clientCategoryId: z.number().int().positive().nullable().optional(),
    clientSubcategoryId: z.number().int().positive().nullable().optional(),
    consultantCategoryId: z.number().int().positive().nullable().optional(),
    consultantSubcategoryId: z.number().int().positive().nullable().optional(),
    contactSourceId: z.number().int().positive().nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    const { ids, ...data } = input;
    // Non-admins can only bulk-edit their own contacts
    if (ctx.user.role !== "admin") {
      for (const id of ids) {
        const existing = await getContactById(id);
        if (!existing || existing.uploadedByUserId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: `Contact ${id} does not belong to you` });
        }
      }
    }
    const count = await bulkUpdateContacts(ids, data);
    await insertAuditLog({
      userId: ctx.user.id,
      action: "bulk_edit",
      entityType: "contact",
      details: JSON.stringify({ ids, ...data }),
    });
    return { updated: count };
  }),

  bulkDelete: protectedProcedure.input(z.object({
    ids: z.array(z.number().int().positive()).min(1),
  })).mutation(async ({ ctx, input }) => {
    // Non-admins can only bulk-delete their own contacts
    if (ctx.user.role !== "admin") {
      for (const id of input.ids) {
        const existing = await getContactById(id);
        if (!existing || existing.uploadedByUserId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: `Contact ${id} does not belong to you` });
        }
      }
    }
    const count = await bulkDeleteContacts(input.ids);
    await insertAuditLog({
      userId: ctx.user.id,
      action: "bulk_delete",
      entityType: "contact",
      details: JSON.stringify({ ids: input.ids, count }),
    });
    return { deleted: count };
  }),

  importCSV: protectedProcedure.input(z.array(z.object({
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
    const result = await importContactsFromCSV(input, ctx.user.id);
    await insertAuditLog({
      userId: ctx.user.id,
      action: "csv_import",
      entityType: "contact",
      details: JSON.stringify({ inserted: result.inserted, skipped: result.skipped }),
    });
    return result;
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
  dashboard: protectedProcedure.query(() => getDashboardStats()),
});

// ─── Audit Router ─────────────────────────────────────────────────────────────
const auditRouter = router({
  list: adminProcedure.input(z.object({
    page: z.number().int().positive().default(1),
    pageSize: z.number().int().positive().max(100).default(50),
  })).query(({ input }) => getAuditLogs(input.page, input.pageSize)),
});

// ─── Admin Router ─────────────────────────────────────────────────────────────
const adminRouter = router({
  listUsers: adminProcedure.query(() => getAllUsers()),
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
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
