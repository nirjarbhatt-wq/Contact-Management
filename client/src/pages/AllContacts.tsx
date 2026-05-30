import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useMetadata } from "@/hooks/useMetadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Mail, Search, Download, Filter, X, Users, ChevronLeft, ChevronRight } from "lucide-react";

function exportToCSV(contacts: any[]) {
  const headers = ["Name", "Phone", "Email", "Region", "Vendor", "Client", "Consultant", "Source", "Uploaded By", "Date"];
  const rows = contacts.map(c => {
    const phones = c.phoneNumbers ? JSON.parse(c.phoneNumbers).join("; ") : "";
    const emails = c.emails ? JSON.parse(c.emails).join("; ") : "";
    return [
      c.displayName, phones, emails,
      c.regionName ?? "", c.vendorName ?? "", c.clientName ?? "",
      c.consultantName ?? "", c.sourceName ?? "", c.uploaderName ?? "",
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

export default function AllContacts() {
  const metadata = useMetadata();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<{
    regionId?: number; vendorId?: number; clientId?: number;
    consultantId?: number; contactSourceId?: number;
  }>({});
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = trpc.contacts.list.useQuery({
    search: search || undefined,
    ...filters,
    page,
    pageSize: 20,
  }, { keepPreviousData: true } as any);

  const contacts = data?.contacts ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const clearFilters = () => { setFilters({}); setPage(1); };

  const setFilter = useCallback((key: string, value: number | undefined) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  }, []);

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

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, phone, or email…" className="pl-9 h-9 text-sm" />
            </div>
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
              <Select value={filters.vendorId?.toString() ?? ""} onValueChange={v => setFilter("vendorId", v ? Number(v) : undefined)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Vendor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Vendors</SelectItem>
                  {metadata.vendors.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.clientId?.toString() ?? ""} onValueChange={v => setFilter("clientId", v ? Number(v) : undefined)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Clients</SelectItem>
                  {metadata.clients.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.consultantId?.toString() ?? ""} onValueChange={v => setFilter("consultantId", v ? Number(v) : undefined)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Consultant" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Consultants</SelectItem>
                  {metadata.consultants.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.contactSourceId?.toString() ?? ""} onValueChange={v => setFilter("contactSourceId", v ? Number(v) : undefined)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sources</SelectItem>
                  {metadata.contactSources.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
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
                  <TableHead className="text-xs">Uploaded By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))}
                {!isLoading && contacts.map((c: any) => {
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
                      <TableCell className="py-3 text-xs text-muted-foreground">{c.vendorName ?? "—"}</TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground">{c.clientName ?? "—"}</TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground">{c.consultantName ?? "—"}</TableCell>
                      <TableCell className="py-3">{c.sourceName ? <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">{c.sourceName}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                      <TableCell className="py-3 text-xs text-muted-foreground">{c.uploaderName ?? "—"}</TableCell>
                    </TableRow>
                  );
                })}
                {!isLoading && contacts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16">
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
    </div>
  );
}
