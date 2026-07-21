import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useMetadata } from "@/hooks/useMetadata";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Phone, Mail, Search, Download, Filter, X, Users, ChevronLeft, ChevronRight, Pencil, Trash2, AudioWaveform, Plus } from "lucide-react";
import { toast } from "sonner";

function exportToCSV(contacts: any[]) {
  const headers = ["Name", "Phone", "Email", "Region", "Vendor", "Client", "Consultant", "Source", "Uploaded By", "Date"];
  const rows = contacts.map(c => {
    let phones = ""; try { phones = JSON.parse(c.phoneNumbers ?? "[]").join("; "); } catch { /* ignore */ }
    let emails = ""; try { emails = JSON.parse(c.emails ?? "[]").join("; "); } catch { /* ignore */ }
    return [
      c.displayName, phones, emails,
      c.regionName ?? "", c.vendorSubcategoryName ?? "", c.clientSubcategoryName ?? "",
      c.consultantSubcategoryName ?? "", c.sourceName ?? "", c.uploaderName ?? "",
      new Date(c.createdAt).toLocaleDateString("en-IN"),
    ];
  });
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `contacts-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const DEPARTMENTS = [
  "Sales", "Marketing", "Engineering", "Operations", "Finance",
  "HR", "Procurement", "Business Development", "Management", "Other",
];

type EditState = {
  id: number;
  displayName: string;
  phones: string[];
  emails: string[];
  regionId: string;
  vendorSubcategoryId: string;
  clientSubcategoryId: string;
  consultantSubcategoryId: string;
  contactSourceId: string;
  notes: string;
};

function initEditState(c: any): EditState {
  let phones: string[] = [];
  let emails: string[] = [];
  try { phones = JSON.parse(c.phoneNumbers ?? "[]"); } catch { /* ignore */ }
  try { emails = JSON.parse(c.emails ?? "[]"); } catch { /* ignore */ }
  return {
    id: c.id,
    displayName: c.displayName ?? "",
    phones: phones.length > 0 ? phones : [""],
    emails: emails.length > 0 ? emails : [""],
    regionId: c.regionId?.toString() ?? "",
    vendorSubcategoryId: c.vendorSubcategoryId?.toString() ?? "",
    clientSubcategoryId: c.clientSubcategoryId?.toString() ?? "",
    consultantSubcategoryId: c.consultantSubcategoryId?.toString() ?? "",
    contactSourceId: c.contactSourceId?.toString() ?? "",
    notes: c.notes ?? "",
  };
}

export default function AllContacts() {
  const metadata = useMetadata();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [phoneticSearch, setPhoneticSearch] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>(undefined);
  const [filters, setFilters] = useState<{
    regionId?: number; vendorSubcategoryId?: number; clientSubcategoryId?: number;
    consultantSubcategoryId?: number; contactSourceId?: number;
  }>({});
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<{
    regionId?: number; contactSourceId?: number;
    vendorSubcategoryId?: number; clientSubcategoryId?: number; consultantSubcategoryId?: number;
  }>({});

  // Edit dialog state
  const [editContact, setEditContact] = useState<EditState | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.contacts.list.useQuery({
    search: search || undefined,
    phoneticSearch: phoneticSearch && !!search,
    ...filters,
    departmentFilter: isAdmin ? departmentFilter : undefined,
    page,
    pageSize: 20,
  }, { keepPreviousData: true } as any);

  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      toast.success("Contact updated");
      utils.contacts.list.invalidate();
      setEditContact(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      toast.success("Contact deleted");
      utils.contacts.list.invalidate();
      utils.reports.dashboard.invalidate();
      setDeleteContactId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkUpdateMutation = trpc.contacts.bulkUpdate.useMutation({
    onSuccess: (res) => {
      toast.success(`Updated ${res.updated} contacts`);
      utils.contacts.list.invalidate();
      setSelectedIds(new Set());
      setShowBulkEdit(false);
      setBulkEditData({});
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkDeleteMutation = trpc.contacts.bulkDelete.useMutation({
    onSuccess: (res) => {
      toast.success(`Deleted ${res.deleted} contacts`);
      utils.contacts.list.invalidate();
      utils.reports.dashboard.invalidate();
      setSelectedIds(new Set());
      setShowBulkDelete(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const contacts = data?.contacts ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);
  const activeFilterCount = Object.values(filters).filter(Boolean).length + (departmentFilter ? 1 : 0);

  const clearFilters = () => { setFilters({}); setDepartmentFilter(undefined); setPage(1); };
  const setFilter = useCallback((key: string, value: number | undefined) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  }, []);

  const toggleRow = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c: any) => c.id)));
    }
  };

  const handleBulkEdit = () => {
    const ids = Array.from(selectedIds);
    const payload: any = { ids };
    if (bulkEditData.regionId) payload.regionId = bulkEditData.regionId;
    if (bulkEditData.contactSourceId) payload.contactSourceId = bulkEditData.contactSourceId;
    if (bulkEditData.vendorSubcategoryId) payload.vendorSubcategoryId = bulkEditData.vendorSubcategoryId;
    if (bulkEditData.clientSubcategoryId) payload.clientSubcategoryId = bulkEditData.clientSubcategoryId;
    if (bulkEditData.consultantSubcategoryId) payload.consultantSubcategoryId = bulkEditData.consultantSubcategoryId;
    bulkUpdateMutation.mutate(payload);
  };

  const handleSaveEdit = () => {
    if (!editContact) return;
    const phones = editContact.phones.map(p => p.trim()).filter(Boolean);
    const emails = editContact.emails.map(e => e.trim()).filter(Boolean);
    updateMutation.mutate({
      id: editContact.id,
      displayName: editContact.displayName.trim() || undefined,
      phoneNumbers: phones,
      emails: emails,
      regionId: editContact.regionId ? Number(editContact.regionId) : null,
      vendorSubcategoryId: editContact.vendorSubcategoryId ? Number(editContact.vendorSubcategoryId) : null,
      clientSubcategoryId: editContact.clientSubcategoryId ? Number(editContact.clientSubcategoryId) : null,
      consultantSubcategoryId: editContact.consultantSubcategoryId ? Number(editContact.consultantSubcategoryId) : null,
      contactSourceId: editContact.contactSourceId ? Number(editContact.contactSourceId) : null,
      notes: editContact.notes || null,
    });
  };

  const canEdit = (c: any) => isAdmin || c.uploadedByUserId === user?.id;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display">All Contacts</h1>
          <p className="text-muted-foreground text-sm mt-1">Contacts uploaded by all team members.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => contacts.length > 0 && exportToCSV(contacts)} className="gap-2" disabled={contacts.length === 0}>
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5">
          <span className="text-sm font-medium text-indigo-300">{selectedIds.size} selected</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/20" onClick={() => setShowBulkEdit(true)}>
              <Pencil className="h-3.5 w-3.5" /> Bulk Edit
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/20" onClick={() => setShowBulkDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Bulk Delete
            </Button>
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setSelectedIds(new Set())}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, phone, or email…" className="pl-9 h-9 text-sm" />
            </div>
            {/* Phonetic search toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
              <Checkbox
                checked={phoneticSearch}
                onCheckedChange={(v) => setPhoneticSearch(!!v)}
                id="phonetic"
              />
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <AudioWaveform className="h-3 w-3" />
                Phonetic
              </span>
            </label>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(v => !v)} className="gap-2 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px]">{activeFilterCount}</Badge>}
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground shrink-0">
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-3 pt-3 border-t">
              <Select value={filters.regionId?.toString() ?? ""} onValueChange={v => setFilter("regionId", v ? Number(v) : undefined)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Region" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Regions</SelectItem>
                  {metadata.regions.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.vendorSubcategoryId?.toString() ?? ""} onValueChange={v => setFilter("vendorSubcategoryId", v ? Number(v) : undefined)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Vendor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Vendors</SelectItem>
                  {metadata.vendorSubcategories.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.clientSubcategoryId?.toString() ?? ""} onValueChange={v => setFilter("clientSubcategoryId", v ? Number(v) : undefined)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Clients</SelectItem>
                  {metadata.clientSubcategories.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.consultantSubcategoryId?.toString() ?? ""} onValueChange={v => setFilter("consultantSubcategoryId", v ? Number(v) : undefined)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Consultant" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Consultants</SelectItem>
                  {metadata.consultantSubcategories.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.contactSourceId?.toString() ?? ""} onValueChange={v => setFilter("contactSourceId", v ? Number(v) : undefined)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sources</SelectItem>
                  {metadata.contactSources.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {isAdmin && (
                <Select value={departmentFilter ?? ""} onValueChange={v => { setDepartmentFilter(v || undefined); setPage(1); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Departments</SelectItem>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 px-3">
                    <Checkbox
                      checked={contacts.length > 0 && selectedIds.size === contacts.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Phone / Email</TableHead>
                  <TableHead className="text-xs">Region</TableHead>
                  <TableHead className="text-xs">Vendor</TableHead>
                  <TableHead className="text-xs">Client</TableHead>
                  <TableHead className="text-xs">Consultant</TableHead>
                  <TableHead className="text-xs">Source</TableHead>
                  <TableHead className="text-xs">Uploaded By</TableHead>
                  <TableHead className="text-xs w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))}
                {!isLoading && contacts.map((c: any) => {
                  let phones: string[] = []; try { phones = JSON.parse(c.phoneNumbers ?? "[]"); } catch { /* ignore */ }
                  let emails: string[] = []; try { emails = JSON.parse(c.emails ?? "[]"); } catch { /* ignore */ }
                  return (
                    <TableRow key={c.id} className={`hover:bg-muted/30 ${selectedIds.has(c.id) ? "bg-indigo-500/5" : ""}`}>
                      <TableCell className="px-3">
                        <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleRow(c.id)} />
                      </TableCell>
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
                      <TableCell className="py-3 text-xs text-muted-foreground">{c.uploaderName ?? "—"}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1">
                          {canEdit(c) && (
                            <Button
                              size="icon" variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditContact(initEditState(c))}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {(isAdmin || c.uploadedByUserId === user?.id) && (
                            <Button
                              size="icon" variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-red-400"
                              onClick={() => setDeleteContactId(c.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!isLoading && contacts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-16">
                      <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No contacts found</p>
                      {activeFilterCount > 0 && <p className="text-xs text-muted-foreground mt-1">Try clearing your filters</p>}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">{total} total contact{total !== 1 ? "s" : ""}</p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
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
          </div>
        </CardContent>
      </Card>

      {/* ── Edit Contact Dialog ── */}
      <Dialog open={!!editContact} onOpenChange={(open) => !open && setEditContact(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          {editContact && (
            <div className="space-y-4 mt-1">
              {/* Display Name */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Display Name *</label>
                <Input
                  value={editContact.displayName}
                  onChange={e => setEditContact(s => s ? { ...s, displayName: e.target.value } : s)}
                  placeholder="Full name or company name"
                  className="h-9 text-sm"
                />
              </div>

              {/* Phone Numbers */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone Numbers</label>
                <div className="space-y-2">
                  {editContact.phones.map((ph, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={ph}
                        onChange={e => setEditContact(s => {
                          if (!s) return s;
                          const phones = [...s.phones];
                          phones[i] = e.target.value;
                          return { ...s, phones };
                        })}
                        placeholder="+91 98765 43210"
                        className="h-9 text-sm flex-1"
                      />
                      {editContact.phones.length > 1 && (
                        <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-red-400"
                          onClick={() => setEditContact(s => s ? { ...s, phones: s.phones.filter((_, idx) => idx !== i) } : s)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground h-8"
                    onClick={() => setEditContact(s => s ? { ...s, phones: [...s.phones, ""] } : s)}>
                    <Plus className="w-3 h-3" /> Add phone
                  </Button>
                </div>
              </div>

              {/* Emails */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Email Addresses</label>
                <div className="space-y-2">
                  {editContact.emails.map((em, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={em}
                        onChange={e => setEditContact(s => {
                          if (!s) return s;
                          const emails = [...s.emails];
                          emails[i] = e.target.value;
                          return { ...s, emails };
                        })}
                        placeholder="email@example.com"
                        className="h-9 text-sm flex-1"
                        type="email"
                      />
                      {editContact.emails.length > 1 && (
                        <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-red-400"
                          onClick={() => setEditContact(s => s ? { ...s, emails: s.emails.filter((_, idx) => idx !== i) } : s)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground h-8"
                    onClick={() => setEditContact(s => s ? { ...s, emails: [...s.emails, ""] } : s)}>
                    <Plus className="w-3 h-3" /> Add email
                  </Button>
                </div>
              </div>

              {/* Region */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Region</label>
                <Select value={editContact.regionId} onValueChange={v => setEditContact(s => s ? { ...s, regionId: v } : s)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select region" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {metadata.regions.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Vendor Subcategory */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Vendor Type</label>
                <Select value={editContact.vendorSubcategoryId} onValueChange={v => setEditContact(s => s ? { ...s, vendorSubcategoryId: v } : s)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select vendor type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {metadata.vendorSubcategories.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Client Subcategory */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Client Type</label>
                <Select value={editContact.clientSubcategoryId} onValueChange={v => setEditContact(s => s ? { ...s, clientSubcategoryId: v } : s)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select client type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {metadata.clientSubcategories.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Consultant Subcategory */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Consultant Type</label>
                <Select value={editContact.consultantSubcategoryId} onValueChange={v => setEditContact(s => s ? { ...s, consultantSubcategoryId: v } : s)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select consultant type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {metadata.consultantSubcategories.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Source */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Source</label>
                <Select value={editContact.contactSourceId} onValueChange={v => setEditContact(s => s ? { ...s, contactSourceId: v } : s)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {metadata.contactSources.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
                <Textarea
                  value={editContact.notes}
                  onChange={e => setEditContact(s => s ? { ...s, notes: e.target.value } : s)}
                  placeholder="Any additional notes…"
                  className="text-sm resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditContact(null)}>Cancel</Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending || !editContact?.displayName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirmation */}
      <AlertDialog open={deleteContactId !== null} onOpenChange={(open) => !open && setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The contact will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteContactId !== null && deleteMutation.mutate({ id: deleteContactId })}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={showBulkEdit} onOpenChange={setShowBulkEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Edit {selectedIds.size} Contact{selectedIds.size > 1 ? "s" : ""}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Only filled fields will be updated. Leave blank to keep existing values.</p>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Region</label>
              <Select value={bulkEditData.regionId?.toString() ?? ""} onValueChange={v => setBulkEditData(d => ({ ...d, regionId: v ? Number(v) : undefined }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Keep existing" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Keep existing</SelectItem>
                  {metadata.regions.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Source</label>
              <Select value={bulkEditData.contactSourceId?.toString() ?? ""} onValueChange={v => setBulkEditData(d => ({ ...d, contactSourceId: v ? Number(v) : undefined }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Keep existing" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Keep existing</SelectItem>
                  {metadata.contactSources.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Vendor Subcategory</label>
              <Select value={bulkEditData.vendorSubcategoryId?.toString() ?? ""} onValueChange={v => setBulkEditData(d => ({ ...d, vendorSubcategoryId: v ? Number(v) : undefined }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Keep existing" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Keep existing</SelectItem>
                  {metadata.vendorSubcategories.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Client Subcategory</label>
              <Select value={bulkEditData.clientSubcategoryId?.toString() ?? ""} onValueChange={v => setBulkEditData(d => ({ ...d, clientSubcategoryId: v ? Number(v) : undefined }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Keep existing" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Keep existing</SelectItem>
                  {metadata.clientSubcategories.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Consultant Subcategory</label>
              <Select value={bulkEditData.consultantSubcategoryId?.toString() ?? ""} onValueChange={v => setBulkEditData(d => ({ ...d, consultantSubcategoryId: v ? Number(v) : undefined }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Keep existing" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Keep existing</SelectItem>
                  {metadata.consultantSubcategories.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowBulkEdit(false)}>Cancel</Button>
            <Button onClick={handleBulkEdit} disabled={bulkUpdateMutation.isPending || Object.values(bulkEditData).every(v => !v)} className="bg-indigo-600 hover:bg-indigo-700">
              {bulkUpdateMutation.isPending ? "Updating…" : "Apply Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} contact{selectedIds.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All selected contacts will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate({ ids: Array.from(selectedIds) })}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkDeleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
