import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useMetadata } from "@/hooks/useMetadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft, ChevronRight, Phone, Mail, Search, Upload,
  Check, Plus, Smartphone, Users
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type DeviceContact = {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phoneNumbers: string[];
  emails: string[];
};

type CategoryType = "vendor" | "client" | "consultant";

type ContactMetadata = {
  regionId?: number;
  selectedCategory?: CategoryType;  // which category radio is selected
  subcategoryId?: number;           // sub-category under the selected category
  contactSourceId?: number;
  notes?: string;
};

// ─── Capacitor Contacts loader ────────────────────────────────────────────────
// On a real iOS/Android device this calls the native Contacts plugin.
// In a browser (web preview / Manus) it falls back to a small sample list so
// the UI remains fully testable without a native bridge.
async function loadDeviceContacts(): Promise<DeviceContact[]> {
  try {
    // Dynamically import so the web bundle doesn't fail if the native bridge
    // is absent (tree-shaking keeps this out of the critical path).
    const { Contacts } = await import("@capacitor-community/contacts");

    // Request permission first
    const perm = await Contacts.requestPermissions();
    if (perm.contacts !== "granted") {
      throw new Error("permission_denied");
    }

    const result = await Contacts.getContacts({
      projection: {
        name: true,
        phones: true,
        emails: true,
      },
    });

    return result.contacts
      .filter(c => c.name?.display || c.phones?.length)
      .map((c, i) => ({
        id: c.contactId ?? String(i),
        displayName: c.name?.display ?? c.name?.given ?? "Unknown",
        firstName: c.name?.given ?? undefined,
        lastName: c.name?.family ?? undefined,
        phoneNumbers: (c.phones ?? []).map(p => p.number ?? "").filter(Boolean),
        emails: (c.emails ?? []).map(e => e.address ?? "").filter(Boolean),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  } catch (err: any) {
    // Native bridge not available (web browser) or permission denied
    if (err?.message === "permission_denied") throw err;
    // Fall back to sample data in browser/web preview
    return WEB_FALLBACK_CONTACTS;
  }
}

// Web-only fallback — shown in browser when native bridge is unavailable
const WEB_FALLBACK_CONTACTS: DeviceContact[] = [
  { id: "1", displayName: "Arjun Sharma", firstName: "Arjun", lastName: "Sharma", phoneNumbers: ["+91 98765 43210"], emails: ["arjun.sharma@example.com"] },
  { id: "2", displayName: "Priya Patel", firstName: "Priya", lastName: "Patel", phoneNumbers: ["+91 87654 32109"], emails: ["priya.patel@techcorp.in"] },
  { id: "3", displayName: "Rahul Verma", firstName: "Rahul", lastName: "Verma", phoneNumbers: ["+91 76543 21098", "+91 99887 76655"], emails: [] },
  { id: "4", displayName: "Sunita Gupta", firstName: "Sunita", lastName: "Gupta", phoneNumbers: ["+91 65432 10987"], emails: ["sunita.gupta@gmail.com"] },
  { id: "5", displayName: "Vikram Singh", firstName: "Vikram", lastName: "Singh", phoneNumbers: ["+91 54321 09876"], emails: ["vikram.singh@company.com"] },
  { id: "6", displayName: "Meera Nair", firstName: "Meera", lastName: "Nair", phoneNumbers: ["+91 43210 98765"], emails: ["meera.nair@outlook.com"] },
  { id: "7", displayName: "Deepak Joshi", firstName: "Deepak", lastName: "Joshi", phoneNumbers: ["+91 32109 87654"], emails: [] },
  { id: "8", displayName: "Kavita Reddy", firstName: "Kavita", lastName: "Reddy", phoneNumbers: ["+91 21098 76543"], emails: ["kavita.reddy@business.in"] },
  { id: "9", displayName: "Amit Kumar", firstName: "Amit", lastName: "Kumar", phoneNumbers: ["+91 10987 65432"], emails: ["amit.kumar@enterprise.com"] },
  { id: "10", displayName: "Neha Agarwal", firstName: "Neha", lastName: "Agarwal", phoneNumbers: ["+91 90876 54321"], emails: ["neha.agarwal@startup.io"] },
  { id: "11", displayName: "Suresh Iyer", firstName: "Suresh", lastName: "Iyer", phoneNumbers: ["+91 80765 43210"], emails: [] },
  { id: "12", displayName: "Pooja Mehta", firstName: "Pooja", lastName: "Mehta", phoneNumbers: ["+91 70654 32109"], emails: ["pooja.mehta@corp.com"] },
];

// ─── Inline Create Subcategory Dialog ─────────────────────────────────────────
function CreateSubcategoryDialog({
  open, onClose, categoryId, categoryName, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  categoryId: number;
  categoryName: string;
  onCreated: (id: number, name: string) => void;
}) {
  const [name, setName] = useState("");
  const { refetch } = useMetadata();
  const createSub = trpc.metadata.createSubcategory.useMutation();

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const result = await createSub.mutateAsync({ categoryId, name: name.trim() });
      await refetch();
      onCreated(result.id, name.trim());
      setName("");
      onClose();
      toast.success(`Sub-category "${name.trim()}" created under ${categoryName}`);
    } catch {
      toast.error("Failed to create sub-category. Name may already exist.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Sub-Category under {categoryName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Sub-Category Name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={`e.g. Flow Meter, OEM, Senior Consultant…`}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || createSub.isPending}>
            {createSub.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Category Radio + Scoped Subcategory ─────────────────────────────────────
const CATEGORY_OPTIONS: { type: CategoryType; label: string; color: string }[] = [
  { type: "vendor",     label: "Vendor",     color: "bg-blue-500" },
  { type: "client",     label: "Client",     color: "bg-emerald-500" },
  { type: "consultant", label: "Consultant", color: "bg-violet-500" },
];

function CategorySubcategorySelector({
  metadata: m,
  selectedCategory,
  subcategoryId,
  onChange,
}: {
  metadata: ReturnType<typeof useMetadata>;
  selectedCategory?: CategoryType;
  subcategoryId?: number;
  onChange: (category: CategoryType | undefined, subcategoryId: number | undefined) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const { refetch } = useMetadata();

  const activeCategoryObj =
    selectedCategory === "vendor"
      ? m.vendorCategory
      : selectedCategory === "client"
        ? m.clientCategory
        : selectedCategory === "consultant"
          ? m.consultantCategory
          : undefined;

  const filteredSubs = activeCategoryObj
    ? m.subcategories.filter(s => s.categoryId === activeCategoryObj.id)
    : [];

  const handleCategoryClick = (type: CategoryType) => {
    if (selectedCategory === type) {
      onChange(undefined, undefined); // deselect
    } else {
      onChange(type, undefined); // switch category, clear sub
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium">Category</Label>

      {/* Radio pill group — pick exactly one */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORY_OPTIONS.map(opt => {
          const isSelected = selectedCategory === opt.type;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => handleCategoryClick(opt.type)}
              className={[
                "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all duration-150 active:scale-95",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
              ].join(" ")}
            >
              <span className={`w-2 h-2 rounded-full ${opt.color} ${isSelected ? "opacity-100" : "opacity-40"}`} />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Sub-category dropdown — only visible after a category is chosen */}
      {selectedCategory && activeCategoryObj && (
        <div className="space-y-1.5 pl-1 border-l-2 border-primary/20 ml-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">
              {CATEGORY_OPTIONS.find(o => o.type === selectedCategory)?.label} Sub-Category
            </Label>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors"
            >
              <Plus className="w-3 h-3" /> New
            </button>
          </div>
          <Select
            value={subcategoryId?.toString() ?? ""}
            onValueChange={v => onChange(selectedCategory, v ? Number(v) : undefined)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select sub-category" />
            </SelectTrigger>
            <SelectContent>
              {filteredSubs.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                  No sub-categories yet — click "+ New" to add one
                </div>
              ) : (
                filteredSubs.map(s => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <CreateSubcategoryDialog
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            categoryId={activeCategoryObj.id}
            categoryName={CATEGORY_OPTIONS.find(o => o.type === selectedCategory)?.label ?? ""}
            onCreated={(id) => {
              onChange(selectedCategory, id);
              refetch();
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Metadata Form ────────────────────────────────────────────────────────────
function MetadataForm({
  contact,
  metadata: m,
  value,
  onChange,
}: {
  contact: DeviceContact;
  metadata: ReturnType<typeof useMetadata>;
  value: ContactMetadata;
  onChange: (v: ContactMetadata) => void;
}) {
  const regionGroups = useMemo(() => ({
    international: m.regions.filter(r => r.category === "international"),
    states: m.regions.filter(r => r.category === "indian_state"),
    uts: m.regions.filter(r => r.category === "union_territory"),
  }), [m.regions]);

  return (
    <div className="space-y-4">
      {/* Contact summary */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-sm">
          {contact.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm">{contact.displayName}</p>
          {contact.phoneNumbers[0] && <p className="text-xs text-muted-foreground">{contact.phoneNumbers[0]}</p>}
          {contact.emails[0] && <p className="text-xs text-muted-foreground">{contact.emails[0]}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Region */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Region</Label>
          <Select
            value={value.regionId?.toString() ?? ""}
            onValueChange={v => onChange({ ...value, regionId: v ? Number(v) : undefined })}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select region" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_intl_header" disabled className="text-muted-foreground text-xs font-semibold">— International —</SelectItem>
              {regionGroups.international.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
              <SelectItem value="_states_header" disabled className="text-muted-foreground text-xs font-semibold">— Indian States —</SelectItem>
              {regionGroups.states.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
              <SelectItem value="_uts_header" disabled className="text-muted-foreground text-xs font-semibold">— Union Territories —</SelectItem>
              {regionGroups.uts.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {/* Category radio selector + scoped sub-category dropdown */}
        <div className="rounded-lg border p-3 bg-card">
          <CategorySubcategorySelector
            metadata={m}
            selectedCategory={value.selectedCategory}
            subcategoryId={value.subcategoryId}
            onChange={(cat, subId) => onChange({
              ...value,
              selectedCategory: cat,
              subcategoryId: subId,
            })}
          />
        </div>
        {/* Source of Contact */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Source of Contact</Label>
          <Select
            value={value.contactSourceId?.toString() ?? ""}
            onValueChange={v => onChange({ ...value, contactSourceId: v ? Number(v) : undefined })}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select source" /></SelectTrigger>
            <SelectContent>
              {m.contactSources.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            value={value.notes ?? ""}
            onChange={e => onChange({ ...value, notes: e.target.value })}
            placeholder="Add any notes about this contact…"
            rows={2}
            className="resize-none text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Step = "browse" | "metadata" | "review";

type DuplicateResult = {
  displayName: string;
  existingName: string;
  matchType: string;
};

export default function AddContacts() {
  const metadata = useMetadata();
  const [step, setStep] = useState<Step>("browse");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [metadataMap, setMetadataMap] = useState<Record<string, ContactMetadata>>({});
  const [metaIdx, setMetaIdx] = useState(0);
  const [duplicates, setDuplicates] = useState<DuplicateResult[]>([]);
  const [showDupDialog, setShowDupDialog] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any[] | null>(null);

  // Device contacts state
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState<"permission_denied" | "error" | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContactsLoading(true);
    setContactsError(null);
    loadDeviceContacts()
      .then(contacts => { if (!cancelled) { setDeviceContacts(contacts); setContactsLoading(false); } })
      .catch(err => {
        if (!cancelled) {
          setContactsError(err?.message === "permission_denied" ? "permission_denied" : "error");
          setContactsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const uploadMutation = trpc.contacts.upload.useMutation();
  const utils = trpc.useUtils();

  const filtered = useMemo(() =>
    deviceContacts.filter(c =>
      c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.phoneNumbers.some(p => p.includes(search)) ||
      c.emails.some(e => e.toLowerCase().includes(search.toLowerCase()))
    ), [search, deviceContacts]);

  const selectedContacts = useMemo(() =>
    deviceContacts.filter(c => selected.has(c.id)), [selected, deviceContacts]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleProceedToMetadata = () => {
    if (selected.size === 0) { toast.error("Please select at least one contact"); return; }
    setMetaIdx(0);
    setStep("metadata");
  };

  const buildPayload = () => selectedContacts.map(c => {
    const meta = metadataMap[c.id] ?? {};
    const vendorCategoryId =
      meta.selectedCategory === "vendor" && metadata.vendorCategory
        ? metadata.vendorCategory.id : undefined;
    const vendorSubcategoryId =
      meta.selectedCategory === "vendor" ? meta.subcategoryId : undefined;
    const clientCategoryId =
      meta.selectedCategory === "client" && metadata.clientCategory
        ? metadata.clientCategory.id : undefined;
    const clientSubcategoryId =
      meta.selectedCategory === "client" ? meta.subcategoryId : undefined;
    const consultantCategoryId =
      meta.selectedCategory === "consultant" && metadata.consultantCategory
        ? metadata.consultantCategory.id : undefined;
    const consultantSubcategoryId =
      meta.selectedCategory === "consultant" ? meta.subcategoryId : undefined;
    return {
      displayName: c.displayName,
      firstName: c.firstName,
      lastName: c.lastName,
      phoneNumbers: c.phoneNumbers,
      emails: c.emails,
      regionId: meta.regionId,
      vendorCategoryId,
      vendorSubcategoryId,
      clientCategoryId,
      clientSubcategoryId,
      consultantCategoryId,
      consultantSubcategoryId,
      contactSourceId: meta.contactSourceId,
      notes: meta.notes,
    };
  });

  const doUpload = async (payload: ReturnType<typeof buildPayload>) => {
    try {
      await uploadMutation.mutateAsync(payload);
      await utils.contacts.list.invalidate();
      await utils.reports.dashboard.invalidate();
      toast.success(`${payload.length} contact${payload.length > 1 ? "s" : ""} uploaded successfully!`);
      setSelected(new Set());
      setMetadataMap({});
      setStep("browse");
      setShowDupDialog(false);
      setPendingPayload(null);
    } catch {
      toast.error("Upload failed. Please try again.");
    }
  };

  const handleUpload = async () => {
    const payload = buildPayload();
    // Collect all phone numbers and emails to check for duplicates
    const allPhones = payload.flatMap(c => c.phoneNumbers);
    const allEmails = payload.flatMap(c => c.emails);
    try {
      const dups = await utils.contacts.checkDuplicates.fetch({ phoneNumbers: allPhones, emails: allEmails });
      if (dups.length > 0) {
        // Map duplicates back to the contact names in our payload
        const dupResults: DuplicateResult[] = dups.map((d: any) => ({
          displayName: d.contactName ?? "Unknown",
          existingName: d.existingName ?? d.contactName ?? "Unknown",
          matchType: d.matchType ?? "phone/email match",
        }));
        setDuplicates(dupResults);
        setPendingPayload(payload);
        setShowDupDialog(true);
      } else {
        await doUpload(payload);
      }
    } catch {
      // If duplicate check fails, proceed with upload anyway
      await doUpload(payload);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Duplicate Warning Dialog */}
      <AlertDialog open={showDupDialog} onOpenChange={setShowDupDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Possible Duplicates Found
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  {duplicates.length} contact{duplicates.length > 1 ? "s" : ""} may already exist in the database.
                </p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-lg border p-2 bg-muted/30">
                  {duplicates.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-background">
                      <span className="font-medium">{d.displayName}</span>
                      <span className="text-muted-foreground">{d.matchType}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">You can skip duplicates or upload anyway to create new entries.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => pendingPayload && doUpload(pendingPayload)}
            >
              Upload Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display">Add Contacts</h1>
        <p className="text-muted-foreground text-sm mt-1">Browse your device contacts, select, and upload with metadata.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(["browse", "metadata", "review"] as Step[]).map((s, i) => {
          const labels = ["Browse & Select", "Add Metadata", "Review & Upload"];
          const isActive = step === s;
          const isDone = (step === "metadata" && s === "browse") || (step === "review" && s !== "review");
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 ${isDone ? "bg-primary" : "bg-border"}`} />}
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all ${isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                {isDone ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
                <span className="hidden sm:inline">{labels[i]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step: Browse */}
      {step === "browse" && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary" /> Device Contacts
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {selected.size > 0 ? `${selected.size} contact${selected.size > 1 ? "s" : ""} selected` : "Select contacts to upload"}
                </CardDescription>
              </div>
              {selected.size > 0 && (
                <Button size="sm" onClick={handleProceedToMetadata} className="gap-1.5">
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts…" className="pl-9 h-9 text-sm" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Loading state */}
            {contactsLoading && (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
                <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm">Loading contacts…</p>
              </div>
            )}
            {/* Permission denied */}
            {!contactsLoading && contactsError === "permission_denied" && (
              <div className="flex flex-col items-center justify-center h-40 gap-3 px-6 text-center">
                <Smartphone className="w-8 h-8 text-amber-500" />
                <p className="text-sm font-medium">Contacts permission denied</p>
                <p className="text-xs text-muted-foreground">Please allow access to contacts in your device settings, then tap Retry.</p>
                <Button size="sm" variant="outline" onClick={() => {
                  setContactsLoading(true); setContactsError(null);
                  loadDeviceContacts()
                    .then(c => { setDeviceContacts(c); setContactsLoading(false); })
                    .catch(err => { setContactsError(err?.message === "permission_denied" ? "permission_denied" : "error"); setContactsLoading(false); });
                }}>Retry</Button>
              </div>
            )}
            {/* Generic error */}
            {!contactsLoading && contactsError === "error" && (
              <div className="flex flex-col items-center justify-center h-40 gap-3 px-6 text-center">
                <Users className="w-8 h-8 text-destructive opacity-60" />
                <p className="text-sm font-medium">Could not load contacts</p>
                <Button size="sm" variant="outline" onClick={() => {
                  setContactsLoading(true); setContactsError(null);
                  loadDeviceContacts()
                    .then(c => { setDeviceContacts(c); setContactsLoading(false); })
                    .catch(err => { setContactsError(err?.message === "permission_denied" ? "permission_denied" : "error"); setContactsLoading(false); });
                }}>Retry</Button>
              </div>
            )}
            {/* Contact list */}
            {!contactsLoading && !contactsError && (
            <ScrollArea className="h-[420px]">
              {filtered.map((c, i) => {
                const isSelected = selected.has(c.id);
                return (
                  <div key={c.id}>
                    {i > 0 && <Separator />}
                    <div
                      onClick={() => toggleSelect(c.id)}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${isSelected ? "bg-primary/5" : ""}`}
                    >
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(c.id)} className="shrink-0" />
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-sm">
                        {c.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{c.displayName}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {c.phoneNumbers[0] && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {c.phoneNumbers[0]}
                            </span>
                          )}
                          {c.emails[0] && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3" /> {c.emails[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Users className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No contacts found</p>
                </div>
              )}
            </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step: Metadata */}
      {step === "metadata" && selectedContacts.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Add Metadata</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Contact {metaIdx + 1} of {selectedContacts.length}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep("browse")} className="gap-1">
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </Button>
            </div>
            {/* Progress dots */}
            <div className="flex gap-1.5 mt-2">
              {selectedContacts.map((_, i) => (
                <button key={i} onClick={() => setMetaIdx(i)} className={`h-1.5 rounded-full transition-all ${i === metaIdx ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground/30"}`} />
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <MetadataForm
              contact={selectedContacts[metaIdx]}
              metadata={metadata}
              value={metadataMap[selectedContacts[metaIdx].id] ?? {}}
              onChange={v => setMetadataMap(prev => ({ ...prev, [selectedContacts[metaIdx].id]: v }))}
            />
            <div className="flex items-center justify-between mt-5 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setMetaIdx(i => Math.max(0, i - 1))} disabled={metaIdx === 0} className="gap-1">
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </Button>
              {metaIdx < selectedContacts.length - 1 ? (
                <Button size="sm" onClick={() => setMetaIdx(i => i + 1)} className="gap-1">
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button size="sm" onClick={() => setStep("review")} className="gap-1">
                  Review <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Review */}
      {step === "review" && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Review & Upload</CardTitle>
                <CardDescription className="text-xs mt-1">{selectedContacts.length} contact{selectedContacts.length > 1 ? "s" : ""} ready to upload</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep("metadata")} className="gap-1">
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ScrollArea className="h-[300px] pr-2">
              <div className="space-y-2">
                {selectedContacts.map(c => {
                  const meta = metadataMap[c.id] ?? {};
                  const region = metadata.regions.find(r => r.id === meta.regionId);
                  const sub = meta.subcategoryId
                    ? metadata.subcategories.find(s => s.id === meta.subcategoryId)
                    : undefined;
                  const source = metadata.contactSources.find(s => s.id === meta.contactSourceId);
                  const catLabel = meta.selectedCategory
                    ? { vendor: "Vendor", client: "Client", consultant: "Consultant" }[meta.selectedCategory]
                    : undefined;
                  const catColor = meta.selectedCategory === "vendor"
                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                    : meta.selectedCategory === "client"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "bg-violet-500/10 text-violet-700 dark:text-violet-300";
                  return (
                    <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-xs">
                        {c.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{c.displayName}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {region && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{region.name}</Badge>}
                          {catLabel && sub && <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${catColor}`}>{catLabel}: {sub.name}</Badge>}
                          {catLabel && !sub && <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${catColor}`}>{catLabel}</Badge>}
                          {source && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{source.name}</Badge>}
                          {!region && !catLabel && !source && (
                            <span className="text-[10px] text-muted-foreground">No metadata added</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <Button onClick={handleUpload} disabled={uploadMutation.isPending} className="w-full gap-2 h-10">
              {uploadMutation.isPending ? (
                <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Uploading…</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload {selectedContacts.length} Contact{selectedContacts.length > 1 ? "s" : ""}</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
