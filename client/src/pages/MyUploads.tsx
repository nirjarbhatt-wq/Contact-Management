import { useState, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useMetadata } from "@/hooks/useMetadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Mail, Search, Pencil, Trash2, ContactRound, ChevronLeft, ChevronRight } from "lucide-react";

type ContactRow = {
  id: number;
  displayName: string;
  phoneNumbers: string | null;
  emails: string | null;
  regionName: string | null;
  vendorSubcategoryName: string | null;
  clientSubcategoryName: string | null;
  consultantSubcategoryName: string | null;
  sourceName: string | null;
  notes: string | null;
  createdAt: Date;
  regionId: number | null;
  vendorCategoryId: number | null;
  vendorSubcategoryId: number | null;
  clientCategoryId: number | null;
  clientSubcategoryId: number | null;
  consultantCategoryId: number | null;
  consultantSubcategoryId: number | null;
  contactSourceId: number | null;
};

function EditDialog({ contact, onClose }: { contact: ContactRow; onClose: () => void }) {
  const metadata = useMetadata();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    regionId: contact.regionId ?? undefined as number | undefined,
    vendorCategoryId: contact.vendorCategoryId ?? undefined as number | undefined,
    vendorSubcategoryId: contact.vendorSubcategoryId ?? undefined as number | undefined,
    clientCategoryId: contact.clientCategoryId ?? undefined as number | undefined,
    clientSubcategoryId: contact.clientSubcategoryId ?? undefined as number | undefined,
    consultantCategoryId: contact.consultantCategoryId ?? undefined as number | undefined,
    consultantSubcategoryId: contact.consultantSubcategoryId ?? undefined as number | undefined,
    contactSourceId: contact.contactSourceId ?? undefined as number | undefined,
    notes: contact.notes ?? "",
  });

  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: async () => {
      await utils.contacts.list.invalidate();
      toast.success("Contact updated");
      onClose();
    },
    onError: () => toast.error("Update failed"),
  });

  const regionGroups = useMemo(() => ({
    international: metadata.regions.filter(r => r.category === "international"),
    states: metadata.regions.filter(r => r.category === "indian_state"),
    uts: metadata.regions.filter(r => r.category === "union_territory"),
  }), [metadata.regions]);

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <p className="text-sm text-muted-foreground">{contact.displayName}</p>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {/* Region */}
          <div className="space-y-1.5">
            <Label className="text-xs">Region</Label>
            <Select value={form.regionId?.toString() ?? ""} onValueChange={v => setForm(f => ({ ...f, regionId: v ? Number(v) : undefined }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select region" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_intl" disabled className="text-muted-foreground text-xs">— International —</SelectItem>
                {regionGroups.international.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                <SelectItem value="_states" disabled className="text-muted-foreground text-xs">— Indian States —</SelectItem>
                {regionGroups.states.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                <SelectItem value="_uts" disabled className="text-muted-foreground text-xs">— Union Territories —</SelectItem>
                {regionGroups.uts.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Vendor Sub-Category */}
          {metadata.vendorCategory && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500/80" />
                <span className="text-xs font-semibold uppercase tracking-wide">Vendor Sub-Category</span>
              </div>
              <Select
                value={form.vendorSubcategoryId?.toString() ?? ""}
                onValueChange={v => setForm(f => ({
                  ...f,
                  vendorCategoryId: v ? metadata.vendorCategory!.id : undefined,
                  vendorSubcategoryId: v ? Number(v) : undefined,
                }))}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select vendor sub-category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {metadata.vendorSubcategories.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Client Sub-Category */}
          {metadata.clientCategory && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-semibold uppercase tracking-wide">Client Sub-Category</span>
              </div>
              <Select
                value={form.clientSubcategoryId?.toString() ?? ""}
                onValueChange={v => setForm(f => ({
                  ...f,
                  clientCategoryId: v ? metadata.clientCategory!.id : undefined,
                  clientSubcategoryId: v ? Number(v) : undefined,
                }))}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select client sub-category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {metadata.clientSubcategories.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Consultant Sub-Category */}
          {metadata.consultantCategory && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-500/80" />
                <span className="text-xs font-semibold uppercase tracking-wide">Consultant Sub-Category</span>
              </div>
              <Select
                value={form.consultantSubcategoryId?.toString() ?? ""}
                onValueChange={v => setForm(f => ({
                  ...f,
                  consultantCategoryId: v ? metadata.consultantCategory!.id : undefined,
                  consultantSubcategoryId: v ? Number(v) : undefined,
                }))}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select consultant sub-category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {metadata.consultantSubcategories.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Source */}
          <div className="space-y-1.5">
            <Label className="text-xs">Source of Contact</Label>
            <Select value={form.contactSourceId?.toString() ?? ""} onValueChange={v => setForm(f => ({ ...f, contactSourceId: v ? Number(v) : undefined }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None —</SelectItem>
                {metadata.contactSources.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="resize-none text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => updateMutation.mutate({ id: contact.id, ...form })} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MyUploads() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editContact, setEditContact] = useState<ContactRow | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.contacts.list.useQuery({
    search: search || undefined,
    myUploadsOnly: true,
    page,
    pageSize: 15,
  }, { keepPreviousData: true } as any);

  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: async () => {
      await utils.contacts.list.invalidate();
      toast.success("Contact deleted");
      setDeleteId(null);
    },
    onError: () => toast.error("Delete failed"),
  });

  const contacts = (data?.contacts ?? []) as ContactRow[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 15);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-display">My Uploads</h1>
        <p className="text-muted-foreground text-sm mt-1">Contacts you have uploaded. Edit or delete as needed.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardDescription className="text-sm">{total} contact{total !== 1 ? "s" : ""} uploaded</CardDescription>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search contacts…" className="pl-9 h-9 text-sm" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Phone / Email</TableHead>
                  <TableHead className="text-xs">Region</TableHead>
                  <TableHead className="text-xs">Vendor</TableHead>
                  <TableHead className="text-xs">Client</TableHead>
                  <TableHead className="text-xs">Consultant</TableHead>
                  <TableHead className="text-xs">Source</TableHead>
                  <TableHead className="text-xs w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))}
                {!isLoading && contacts.map(c => {
                  const phones = c.phoneNumbers ? JSON.parse(c.phoneNumbers) as string[] : [];
                  const emails = c.emails ? JSON.parse(c.emails) as string[] : [];
                  return (
                    <TableRow key={c.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-sm py-3">{c.displayName}</TableCell>
                      <TableCell className="py-3">
                        <div className="space-y-0.5">
                          {phones[0] && <div className="text-xs flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{phones[0]}</div>}
                          {emails[0] && <div className="text-xs flex items-center gap-1 text-muted-foreground"><Mail className="w-3 h-3" />{emails[0]}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">{c.regionName ? <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{c.regionName}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground">{c.vendorSubcategoryName ?? "—"}</TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground">{c.clientSubcategoryName ?? "—"}</TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground">{c.consultantSubcategoryName ?? "—"}</TableCell>
                      <TableCell className="py-3">{c.sourceName ? <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">{c.sourceName}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditContact(c)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!isLoading && contacts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <ContactRound className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No contacts uploaded yet</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {editContact && <EditDialog contact={editContact} onClose={() => setEditContact(null)} />}

      <AlertDialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this contact. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
