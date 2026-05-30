import { trpc } from "@/lib/trpc";

/**
 * Shared metadata hook.
 * Categories (Vendor, Client, Consultant) are fixed system-level items.
 * Subcategories are user-managed items under each category.
 */
export function useMetadata() {
  const { data, isLoading, refetch } = trpc.metadata.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const categories = data?.categories ?? [];
  const subcategories = data?.subcategories ?? [];
  const regions = data?.regions ?? [];
  const contactSources = data?.contactSources ?? [];

  // The 3 fixed categories by type
  const vendorCategory = categories.find(c => c.type === "vendor");
  const clientCategory = categories.find(c => c.type === "client");
  const consultantCategory = categories.find(c => c.type === "consultant");

  // Subcategories filtered by category
  const vendorSubcategories = vendorCategory
    ? subcategories.filter(s => s.categoryId === vendorCategory.id)
    : [];
  const clientSubcategories = clientCategory
    ? subcategories.filter(s => s.categoryId === clientCategory.id)
    : [];
  const consultantSubcategories = consultantCategory
    ? subcategories.filter(s => s.categoryId === consultantCategory.id)
    : [];

  return {
    isLoading,
    refetch,
    regions,
    contactSources,
    categories,
    subcategories,
    vendorCategory,
    clientCategory,
    consultantCategory,
    vendorSubcategories,
    clientSubcategories,
    consultantSubcategories,
  };
}

export type MetadataHook = ReturnType<typeof useMetadata>;
