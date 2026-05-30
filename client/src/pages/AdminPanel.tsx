import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ShieldAlert, Building2, Users, Briefcase, Tag } from "lucide-react";

function EntityManager({
  title, icon: Icon, items, onAdd, onDelete, isLoading,
  parentLabel, parentItems, isSubcategory, getParentName
}: {
  title: string;
  icon: any;
  items: { id: number; name: string; parentId?: number | null }[];
  onAdd: (name: string, parentId?: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  isLoading: boolean;
  parentLabel?: string;
  parentItems?: { id: number; name: string }[];
  isSubcategory?: boolean;
  getParentName?: (parentId: number) => string;
}) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<number | undefined>();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    if (isSubcategory && !parentId) { toast.error(`Please select a ${parentLabel}`); return; }
    setAdding(true);
    try {
      await onAdd(name.trim(), parentId);
      setName("");
      setParentId(undefined);
      toast.success(`${title} added`);
    } catch {
      toast.error("Name may already exist");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" /> {title}
          <Badge variant="secondary" className="ml-auto text-[10px]">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add form */}
        <div className="flex gap-2">
          {isSubcategory && parentItems && (
            <Select value={parentId?.toString() ?? ""} onValueChange={v => setParentId(v ? Number(v) : undefined)}>
              <SelectTrigger className="h-9 text-sm w-36 shrink-0">
                <SelectValue placeholder={parentLabel} />
              </SelectTrigger>
              <SelectContent>
                {parentItems.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={`New ${title.toLowerCase()} name…`}
            className="h-9 text-sm flex-1"
            onKeyDown={e => e.key === "Enter" && handleAdd()}
          />
          <Button size="sm" onClick={handleAdd} disabled={adding || !name.trim()} className="gap-1.5 shrink-0">
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>

        <Separator />

        {/* Items list */}
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {isLoading && <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>}
          {!isLoading && items.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No {title.toLowerCase()} yet. Add one above.</p>
          )}
          {!isLoading && items.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 group">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm truncate">{item.name}</span>
                {isSubcategory && item.parentId && getParentName && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal shrink-0">
                    {getParentName(item.parentId)}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive shrink-0"
                onClick={() => setDeleteId(item.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>

      <AlertDialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {title}</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {title.toLowerCase()}. Contacts using it will lose this association.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => { if (deleteId) { await onDelete(deleteId); setDeleteId(null); } }}
              className="bg-destructive hover:bg-destructive/90"
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default function AdminPanel() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: metadata, isLoading } = trpc.metadata.getAll.useQuery();

  const createVendor = trpc.metadata.createVendor.useMutation({ onSuccess: () => utils.metadata.getAll.invalidate() });
  const deleteVendor = trpc.metadata.deleteVendor.useMutation({ onSuccess: () => utils.metadata.getAll.invalidate() });
  const createVendorSub = trpc.metadata.createVendorSubcategory.useMutation({ onSuccess: () => utils.metadata.getAll.invalidate() });
  const deleteVendorSub = trpc.metadata.deleteVendorSubcategory.useMutation({ onSuccess: () => utils.metadata.getAll.invalidate() });
  const createClient = trpc.metadata.createClient.useMutation({ onSuccess: () => utils.metadata.getAll.invalidate() });
  const deleteClient = trpc.metadata.deleteClient.useMutation({ onSuccess: () => utils.metadata.getAll.invalidate() });
  const createClientSub = trpc.metadata.createClientSubcategory.useMutation({ onSuccess: () => utils.metadata.getAll.invalidate() });
  const deleteClientSub = trpc.metadata.deleteClientSubcategory.useMutation({ onSuccess: () => utils.metadata.getAll.invalidate() });
  const createConsultant = trpc.metadata.createConsultant.useMutation({ onSuccess: () => utils.metadata.getAll.invalidate() });
  const deleteConsultant = trpc.metadata.deleteConsultant.useMutation({ onSuccess: () => utils.metadata.getAll.invalidate() });

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Access Restricted</h2>
          <p className="text-muted-foreground text-sm mt-1">This section is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  const vendors = metadata?.vendors ?? [];
  const vendorSubs = metadata?.vendorSubcategories ?? [];
  const clients = metadata?.clients ?? [];
  const clientSubs = metadata?.clientSubcategories ?? [];
  const consultants = metadata?.consultants ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-display">Admin Panel</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage master data — vendors, clients, consultants, and sub-categories.</p>
      </div>

      <Tabs defaultValue="vendors">
        <TabsList className="h-9">
          <TabsTrigger value="vendors" className="text-xs gap-1.5"><Building2 className="w-3.5 h-3.5" />Vendors</TabsTrigger>
          <TabsTrigger value="clients" className="text-xs gap-1.5"><Briefcase className="w-3.5 h-3.5" />Clients</TabsTrigger>
          <TabsTrigger value="consultants" className="text-xs gap-1.5"><Users className="w-3.5 h-3.5" />Consultants</TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EntityManager
              title="Vendors" icon={Building2}
              items={vendors}
              onAdd={async (name) => { await createVendor.mutateAsync({ name }); }}
              onDelete={async (id) => { await deleteVendor.mutateAsync({ id }); toast.success("Vendor deleted"); }}
              isLoading={isLoading}
            />
            <EntityManager
              title="Vendor Sub-Categories" icon={Tag}
              items={vendorSubs.map(s => ({ ...s, parentId: s.vendorId }))}
              onAdd={async (name, parentId) => { await createVendorSub.mutateAsync({ vendorId: parentId!, name }); }}
              onDelete={async (id) => { await deleteVendorSub.mutateAsync({ id }); toast.success("Sub-category deleted"); }}
              isLoading={isLoading}
              isSubcategory
              parentLabel="Vendor"
              parentItems={vendors}
              getParentName={(id) => vendors.find(v => v.id === id)?.name ?? ""}
            />
          </div>
        </TabsContent>

        <TabsContent value="clients" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EntityManager
              title="Clients" icon={Briefcase}
              items={clients}
              onAdd={async (name) => { await createClient.mutateAsync({ name }); }}
              onDelete={async (id) => { await deleteClient.mutateAsync({ id }); toast.success("Client deleted"); }}
              isLoading={isLoading}
            />
            <EntityManager
              title="Client Sub-Categories" icon={Tag}
              items={clientSubs.map(s => ({ ...s, parentId: s.clientId }))}
              onAdd={async (name, parentId) => { await createClientSub.mutateAsync({ clientId: parentId!, name }); }}
              onDelete={async (id) => { await deleteClientSub.mutateAsync({ id }); toast.success("Sub-category deleted"); }}
              isLoading={isLoading}
              isSubcategory
              parentLabel="Client"
              parentItems={clients}
              getParentName={(id) => clients.find(c => c.id === id)?.name ?? ""}
            />
          </div>
        </TabsContent>

        <TabsContent value="consultants" className="mt-4">
          <div className="max-w-md">
            <EntityManager
              title="Consultants" icon={Users}
              items={consultants}
              onAdd={async (name) => { await createConsultant.mutateAsync({ name }); }}
              onDelete={async (id) => { await deleteConsultant.mutateAsync({ id }); toast.success("Consultant deleted"); }}
              isLoading={isLoading}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
