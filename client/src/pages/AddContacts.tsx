import { useState, useMemo } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft, ChevronRight, Phone, Mail, Search, Upload,
  UserPlus, Check, X, Plus, Smartphone, Users
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

type ContactMetadata = {
  regionId?: number;
  vendorId?: number;
  vendorSubcategoryId?: number;
  clientId?: number;
  clientSubcategoryId?: number;
  consultantId?: number;
  contactSourceId?: number;
  notes?: string;
};

// ─── Simulated device contacts (Capacitor bridge for web preview) ─────────────
const SAMPLE_CONTACTS: DeviceContact[] = [
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

// ─── Inline Create Dialog ─────────────────────────────────────────────────────
function CreateEntityDialog({
  open, onClose, title, onCreated, parentLabel, parentOptions, isSubcategory
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  onCreated: (id: number, name: string, parentId?: number) => void;
  parentLabel?: string;
  parentOptions?: { id: number; name: string }[];
  isSubcategory?: boolean;
}) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<number | undefined>();
  const { refetch } = useMetadata();

  const createVendor = trpc.metadata.createVendor.useMutation();
  const createVendorSub = trpc.metadata.createVendorSubcategory.useMutation();
  const createClient = trpc.metadata.createClient.useMutation();
  const createClientSub = trpc.metadata.createClientSubcategory.useMutation();
  const createConsultant = trpc.metadata.createConsultant.useMutation();

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      let id: number;
      if (title.includes("Vendor Sub")) {
        const r = await createVendorSub.mutateAsync({ vendorId: parentId!, name: name.trim() });
        id = r.id;
      } else if (title.includes("Client Sub")) {
        const r = await createClientSub.mutateAsync({ clientId: parentId!, name: name.trim() });
        id = r.id;
      } else if (title.includes("Vendor")) {
        const r = await createVendor.mutateAsync({ name: name.trim() });
        id = r.id;
      } else if (title.includes("Client")) {
        const r = await createClient.mutateAsync({ name: name.trim() });
        id = r.id;
      } else {
        const r = await createConsultant.mutateAsync({ name: name.trim() });
        id = r.id;
      }
      await refetch();
      onCreated(id, name.trim(), parentId);
      setName("");
      setParentId(undefined);
      onClose();
      toast.success(`${title} created`);
    } catch {
      toast.error("Failed to create. Name may already exist.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {isSubcategory && parentOptions && (
            <div className="space-y-1.5">
              <Label>{parentLabel}</Label>
              <Select value={parentId?.toString()} onValueChange={v => setParentId(Number(v))}>
                <SelectTrigger><SelectValue placeholder={`Select ${parentLabel}`} /></SelectTrigger>
                <SelectContent>
                  {parentOptions.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={`Enter ${title} name`} onKeyDown={e => e.key === "Enter" && handleCreate()} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || (isSubcategory && !parentId)}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Metadata Form ────────────────────────────────────────────────────────────
function MetadataForm({
  contact, metadata: m, value, onChange
}: {
  contact: DeviceContact;
  metadata: ReturnType<typeof useMetadata>;
  value: ContactMetadata;
  onChange: (v: ContactMetadata) => void;
}) {
  const [createDialog, setCreateDialog] = useState<string | null>(null);

  const filteredVendorSubs = useMemo(
    () => m.vendorSubcategories.filter(s => s.vendorId === value.vendorId),
    [m.vendorSubcategories, value.vendorId]
  );
  const filteredClientSubs = useMemo(
    () => m.clientSubcategories.filter(s => s.clientId === value.clientId),
    [m.clientSubcategories, value.clientId]
  );

  const regionGroups = useMemo(() => ({
    international: m.regions.filter(r => r.category === "international"),
    states: m.regions.filter(r => r.category === "indian_state"),
    uts: m.regions.filter(r => r.category === "union_territory"),
  }), [m.regions]);

  return (
    <div className="space-y-4">
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

      <div className="grid grid-cols-1 gap-3">
        {/* Region */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Region</Label>
          <Select value={value.regionId?.toString() ?? ""} onValueChange={v => onChange({ ...value, regionId: v ? Number(v) : undefined })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select region" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none" disabled className="text-muted-foreground text-xs">— International —</SelectItem>
              {regionGroups.international.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
              <SelectItem value="none2" disabled className="text-muted-foreground text-xs">— Indian States —</SelectItem>
              {regionGroups.states.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
              <SelectItem value="none3" disabled className="text-muted-foreground text-xs">— Union Territories —</SelectItem>
              {regionGroups.uts.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Vendor + Sub */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Vendor</Label>
              <button onClick={() => setCreateDialog("vendor")} className="text-primary hover:text-primary/80 transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <Select value={value.vendorId?.toString() ?? ""} onValueChange={v => onChange({ ...value, vendorId: v ? Number(v) : undefined, vendorSubcategoryId: undefined })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select vendor" /></SelectTrigger>
              <SelectContent>
                {m.vendors.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}
                {m.vendors.length === 0 && <SelectItem value="empty" disabled>No vendors yet</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Vendor Sub-Category</Label>
              <button onClick={() => setCreateDialog("vendor_sub")} className="text-primary hover:text-primary/80 transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <Select value={value.vendorSubcategoryId?.toString() ?? ""} onValueChange={v => onChange({ ...value, vendorSubcategoryId: v ? Number(v) : undefined })} disabled={!value.vendorId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={value.vendorId ? "Select sub-category" : "Select vendor first"} /></SelectTrigger>
              <SelectContent>
                {filteredVendorSubs.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                {filteredVendorSubs.length === 0 && <SelectItem value="empty" disabled>No sub-categories yet</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Client + Sub */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Client</Label>
              <button onClick={() => setCreateDialog("client")} className="text-primary hover:text-primary/80 transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <Select value={value.clientId?.toString() ?? ""} onValueChange={v => onChange({ ...value, clientId: v ? Number(v) : undefined, clientSubcategoryId: undefined })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {m.clients.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                {m.clients.length === 0 && <SelectItem value="empty" disabled>No clients yet</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Client Sub-Category</Label>
              <button onClick={() => setCreateDialog("client_sub")} className="text-primary hover:text-primary/80 transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <Select value={value.clientSubcategoryId?.toString() ?? ""} onValueChange={v => onChange({ ...value, clientSubcategoryId: v ? Number(v) : undefined })} disabled={!value.clientId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={value.clientId ? "Select sub-category" : "Select client first"} /></SelectTrigger>
              <SelectContent>
                {filteredClientSubs.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                {filteredClientSubs.length === 0 && <SelectItem value="empty" disabled>No sub-categories yet</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Consultant */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Consultant</Label>
            <button onClick={() => setCreateDialog("consultant")} className="text-primary hover:text-primary/80 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <Select value={value.consultantId?.toString() ?? ""} onValueChange={v => onChange({ ...value, consultantId: v ? Number(v) : undefined })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select consultant" /></SelectTrigger>
            <SelectContent>
              {m.consultants.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
              {m.consultants.length === 0 && <SelectItem value="empty" disabled>No consultants yet</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        {/* Source */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Source of Contact</Label>
          <Select value={value.contactSourceId?.toString() ?? ""} onValueChange={v => onChange({ ...value, contactSourceId: v ? Number(v) : undefined })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select source" /></SelectTrigger>
            <SelectContent>
              {m.contactSources.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea value={value.notes ?? ""} onChange={e => onChange({ ...value, notes: e.target.value })} placeholder="Add any notes about this contact…" rows={2} className="resize-none text-sm" />
        </div>
      </div>

      {/* Create Dialogs */}
      <CreateEntityDialog open={createDialog === "vendor"} onClose={() => setCreateDialog(null)} title="New Vendor" onCreated={(id, name) => onChange({ ...value, vendorId: id })} />
      <CreateEntityDialog open={createDialog === "vendor_sub"} onClose={() => setCreateDialog(null)} title="New Vendor Sub-Category" isSubcategory parentLabel="Vendor" parentOptions={m.vendors} onCreated={(id, name, parentId) => onChange({ ...value, vendorSubcategoryId: id })} />
      <CreateEntityDialog open={createDialog === "client"} onClose={() => setCreateDialog(null)} title="New Client" onCreated={(id, name) => onChange({ ...value, clientId: id })} />
      <CreateEntityDialog open={createDialog === "client_sub"} onClose={() => setCreateDialog(null)} title="New Client Sub-Category" isSubcategory parentLabel="Client" parentOptions={m.clients} onCreated={(id, name, parentId) => onChange({ ...value, clientSubcategoryId: id })} />
      <CreateEntityDialog open={createDialog === "consultant"} onClose={() => setCreateDialog(null)} title="New Consultant" onCreated={(id, name) => onChange({ ...value, consultantId: id })} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Step = "browse" | "metadata" | "review";

export default function AddContacts() {
  const metadata = useMetadata();
  const [step, setStep] = useState<Step>("browse");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [metadataMap, setMetadataMap] = useState<Record<string, ContactMetadata>>({});
  const [metaIdx, setMetaIdx] = useState(0);

  const uploadMutation = trpc.contacts.upload.useMutation();
  const utils = trpc.useUtils();

  const filtered = useMemo(() =>
    SAMPLE_CONTACTS.filter(c =>
      c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.phoneNumbers.some(p => p.includes(search)) ||
      c.emails.some(e => e.toLowerCase().includes(search.toLowerCase()))
    ), [search]);

  const selectedContacts = useMemo(() =>
    SAMPLE_CONTACTS.filter(c => selected.has(c.id)), [selected]);

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

  const handleUpload = async () => {
    try {
      const payload = selectedContacts.map(c => ({
        displayName: c.displayName,
        firstName: c.firstName,
        lastName: c.lastName,
        phoneNumbers: c.phoneNumbers,
        emails: c.emails,
        ...metadataMap[c.id],
      }));
      await uploadMutation.mutateAsync(payload);
      await utils.contacts.list.invalidate();
      toast.success(`${payload.length} contact${payload.length > 1 ? "s" : ""} uploaded successfully!`);
      setSelected(new Set());
      setMetadataMap({});
      setStep("browse");
    } catch {
      toast.error("Upload failed. Please try again.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
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
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep("browse")} className="gap-1">
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </Button>
              </div>
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
                  const m = metadataMap[c.id] ?? {};
                  const region = metadata.regions.find(r => r.id === m.regionId);
                  const vendor = metadata.vendors.find(v => v.id === m.vendorId);
                  const client = metadata.clients.find(cl => cl.id === m.clientId);
                  const source = metadata.contactSources.find(s => s.id === m.contactSourceId);
                  return (
                    <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-xs">
                        {c.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{c.displayName}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {region && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{region.name}</Badge>}
                          {vendor && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{vendor.name}</Badge>}
                          {client && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{client.name}</Badge>}
                          {source && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{source.name}</Badge>}
                          {!region && !vendor && !client && !source && (
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
