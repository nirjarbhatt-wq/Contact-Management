import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMetadata } from "@/hooks/useMetadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ShieldAlert, Building2, Users, Briefcase, Tag } from "lucide-react";

/**
 * SubcategoryManager — manages subcategories under a single fixed category.
 * Categories (Vendor, Client, Consultant) are fixed system-level items.
 * Only subcategories are user-managed.
 */
function SubcategoryManager({
  title, icon: Icon, categoryId, subcategories, isLoading,
  onAdd, onDelete,
}: {
  title: string;
  icon: React.ElementType;
  categoryId: number | undefined;
  subcategories: { id: number; name: string; categoryId: number }[];
  isLoading: boolean;
  onAdd: (categoryId: number, name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleAdd = async () => {
    if (!name.trim() || !categoryId) return;
    setAdding(true);
    try {
      await onAdd(categoryId, name.trim());
      setName("");
      toast.success(`Sub-category added to ${title}`);
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
          <Icon className="w-4 h-4 text-primary" />
          {title} Sub-Categories
          <Badge variant="secondary" className="ml-auto text-[10px]">{subcategories.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add form */}
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={`New ${title.toLowerCase()} sub-category…`}
            className="h-9 text-sm flex-1"
            onKeyDown={e => e.key === "Enter" && handleAdd()}
          />
          <Button size="sm" onClick={handleAdd} disabled={adding || !name.trim() || !categoryId} className="gap-1.5 shrink-0">
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>

        <Separator />

        {/* Items list */}
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {isLoading && <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>}
          {!isLoading && subcategories.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              No sub-categories yet. Add one above.
            </p>
          )}
          {!isLoading && subcategories.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 group">
              <span className="text-sm truncate">{item.name}</span>
              <Button
                variant="ghost" size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteId(item.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>

      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sub-Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the sub-category. Contacts already tagged with it will retain the reference but it won't appear in new selections.
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
  const metadata = useMetadata();

  const createSubcategory = trpc.metadata.createSubcategory.useMutation({
    onSuccess: () => utils.metadata.getAll.invalidate(),
  });
  const deleteSubcategory = trpc.metadata.deleteSubcategory.useMutation({
    onSuccess: () => utils.metadata.getAll.invalidate(),
  });

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

  const { vendorCategory, clientCategory, consultantCategory,
    vendorSubcategories, clientSubcategories, consultantSubcategories, isLoading } = metadata;

  const handleAdd = async (categoryId: number, name: string) => {
    await createSubcategory.mutateAsync({ categoryId, name });
  };

  const handleDelete = async (id: number) => {
    await deleteSubcategory.mutateAsync({ id });
    toast.success("Sub-category deleted");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-display">Admin Panel</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage sub-categories under each fixed category (Vendor, Client, Consultant).
        </p>
      </div>

      {/* Category explanation banner */}
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <strong className="text-foreground">How categories work:</strong> Vendor, Client, and Consultant are fixed system-level categories.
        Users select a category (e.g. "Vendor") and then choose a sub-category (e.g. "Flow Meter", "Sensor").
        Add or remove sub-categories here to control what users can select.
      </div>

      <Tabs defaultValue="vendor">
        <TabsList className="h-9">
          <TabsTrigger value="vendor" className="text-xs gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Vendor
          </TabsTrigger>
          <TabsTrigger value="client" className="text-xs gap-1.5">
            <Briefcase className="w-3.5 h-3.5" /> Client
          </TabsTrigger>
          <TabsTrigger value="consultant" className="text-xs gap-1.5">
            <Users className="w-3.5 h-3.5" /> Consultant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendor" className="mt-4 max-w-lg">
          <SubcategoryManager
            title="Vendor"
            icon={Building2}
            categoryId={vendorCategory?.id}
            subcategories={vendorSubcategories}
            isLoading={isLoading}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="client" className="mt-4 max-w-lg">
          <SubcategoryManager
            title="Client"
            icon={Briefcase}
            categoryId={clientCategory?.id}
            subcategories={clientSubcategories}
            isLoading={isLoading}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="consultant" className="mt-4 max-w-lg">
          <SubcategoryManager
            title="Consultant"
            icon={Users}
            categoryId={consultantCategory?.id}
            subcategories={consultantSubcategories}
            isLoading={isLoading}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
