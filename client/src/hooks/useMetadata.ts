import { trpc } from "@/lib/trpc";

export function useMetadata() {
  const { data, isLoading, refetch } = trpc.metadata.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  return {
    regions: data?.regions ?? [],
    vendors: data?.vendors ?? [],
    vendorSubcategories: data?.vendorSubcategories ?? [],
    clients: data?.clients ?? [],
    clientSubcategories: data?.clientSubcategories ?? [],
    consultants: data?.consultants ?? [],
    contactSources: data?.contactSources ?? [],
    isLoading,
    refetch,
  };
}
