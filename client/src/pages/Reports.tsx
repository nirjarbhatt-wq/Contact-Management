import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, BarChart3, PieChart, TrendingUp, Users, Phone, Mail, X } from "lucide-react";
import {
  PieChart as RechartsPie, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line
} from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#818cf8", "#4f46e5", "#7c3aed", "#5b21b6", "#4338ca"];

type FilterType = "region" | "vendorSubcategory" | "clientSubcategory" | "consultantSubcategory" | "source";
type DrilldownState = { filterType: FilterType; filterId: number; label: string } | null;

function exportChartCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [headers, ...data.map(r => headers.map(h => r[h]))].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function DrilldownSheet({ state, onClose }: { state: DrilldownState; onClose: () => void }) {
  const { data: contacts = [], isLoading } = trpc.reports.drilldown.useQuery(
    { filterType: state!.filterType, filterId: state!.filterId },
    { enabled: !!state }
  );

  const exportDrilldown = () => {
    if (!contacts.length) return;
    const rows = contacts.map((c: any) => ({
      Name: c.displayName,
      Phone: JSON.parse(c.phoneNumbers ?? "[]").join("; "),
      Email: JSON.parse(c.emails ?? "[]").join("; "),
      Notes: c.notes ?? "",
      Added: new Date(c.createdAt).toLocaleDateString(),
    }));
    exportChartCSV(rows, `drilldown-${state!.label.toLowerCase().replace(/\s+/g, "-")}.csv`);
  };

  return (
    <Sheet open={!!state} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-base">{state?.label}</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                {isLoading ? "Loading…" : `${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="outline" size="sm" onClick={exportDrilldown} disabled={!contacts.length} className="h-7 gap-1 text-xs">
                <Download className="w-3 h-3" /> CSV
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </SheetHeader>
        <ScrollArea className="flex-1 px-5 py-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
              <Users className="w-8 h-8 opacity-30" />
              <p>No contacts found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contacts.map((c: any) => {
                const phones: string[] = JSON.parse(c.phoneNumbers ?? "[]");
                const emails: string[] = JSON.parse(c.emails ?? "[]");
                return (
                  <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-xs">
                      {c.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{c.displayName}</p>
                      {phones[0] && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {phones[0]}
                        </p>
                      )}
                      {emails[0] && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" /> {emails[0]}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function ChartCard({
  title, description, data, type, dataKey, nameKey, idKey, filterType, onExport, isLoading, onDrilldown,
}: {
  title: string; description?: string; data: any[]; type: "pie" | "bar" | "line";
  dataKey: string; nameKey: string; idKey?: string; filterType?: FilterType;
  onExport: () => void; isLoading: boolean;
  onDrilldown?: (filterId: number, label: string) => void;
}) {
  const isClickable = !!onDrilldown && !!filterType && !!idKey;

  const handleBarClick = (e: any) => {
    if (!isClickable || !e?.activePayload?.[0]) return;
    const entry = e.activePayload[0].payload;
    if (entry?.[idKey!] != null) onDrilldown!(Number(entry[idKey!]), `${title} → ${entry[nameKey]}`);
  };

  const handlePieClick = (entry: any) => {
    if (!isClickable) return;
    if (entry?.[idKey!] != null) onDrilldown!(Number(entry[idKey!]), `${title} → ${entry[nameKey]}`);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              {title}
              {isClickable && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-normal">click to drill down</Badge>
              )}
            </CardTitle>
            {description && <CardDescription className="text-xs mt-0.5">{description}</CardDescription>}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={e => { e.stopPropagation(); onExport(); }} disabled={!data.length}>
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-52 w-full rounded-lg" />
        ) : data.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No data available</div>
        ) : type === "pie" ? (
          <ResponsiveContainer width="100%" height={220}>
            <RechartsPie>
              <Pie
                data={data} dataKey={dataKey} nameKey={nameKey}
                cx="50%" cy="50%" outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                onClick={isClickable ? handlePieClick : undefined}
                style={isClickable ? { cursor: "pointer" } : undefined}
              >
                {data.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => [v, "Contacts"]} />
            </RechartsPie>
          </ResponsiveContainer>
        ) : type === "bar" ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={data}
              margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              onClick={isClickable ? handleBarClick : undefined}
              style={isClickable ? { cursor: "pointer" } : undefined}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey={nameKey} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: any) => [v, "Contacts"]} />
              <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
                {data.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey={nameKey} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey={dataKey} stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const [drilldown, setDrilldown] = useState<DrilldownState>(null);

  const { data: overview, isLoading: l0 } = trpc.reports.overview.useQuery();
  const { data: byRegionRaw = [], isLoading: l1 } = trpc.reports.byRegion.useQuery();
  const { data: byVendorSubRaw = [], isLoading: l3 } = trpc.reports.byVendorSubcategory.useQuery();
  const { data: byClientSubRaw = [], isLoading: l5 } = trpc.reports.byClientSubcategory.useQuery();
  const { data: byConsultantSubRaw = [], isLoading: l6 } = trpc.reports.byConsultantSubcategory.useQuery();
  const { data: bySourceRaw = [], isLoading: l7 } = trpc.reports.bySource.useQuery();
  const { data: byActivityRaw = [], isLoading: l8 } = trpc.reports.uploadActivity.useQuery();
  const isLoading = l0 || l1 || l3 || l5 || l6 || l7 || l8;

  const byRegion = byRegionRaw.map((r: any) => ({ id: r.regionId, name: r.regionName ?? "Unknown", count: Number(r.count) }));
  const byVendorSub = byVendorSubRaw.map((r: any) => ({ id: r.subcategoryId, name: r.subcategoryName, count: Number(r.count) }));
  const byClientSub = byClientSubRaw.map((r: any) => ({ id: r.subcategoryId, name: r.subcategoryName, count: Number(r.count) }));
  const byConsultantSub = byConsultantSubRaw.map((r: any) => ({ id: r.subcategoryId, name: r.subcategoryName, count: Number(r.count) }));
  const bySource = bySourceRaw.map((r: any) => ({ id: r.contactSourceId, name: r.sourceName ?? "Unknown", count: Number(r.count) }));
  const byActivity = byActivityRaw.map((r: any) => ({ date: r.date, count: Number(r.count) }));

  const openDrilldown = (filterType: FilterType) => (filterId: number, label: string) => {
    setDrilldown({ filterType, filterId, label });
  };

  const summaryCards = [
    { label: "Total Contacts", value: overview?.totalContacts ?? 0, icon: Users },
    { label: "Regions Covered", value: byRegion.length, icon: BarChart3 },
    { label: "Vendor Sub-Categories", value: byVendorSub.length, icon: TrendingUp },
    { label: "Client Sub-Categories", value: byClientSub.length, icon: PieChart },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Reports & Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Click any chart segment or bar to drill down into the underlying contacts.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold mt-0.5">{value}</p>}
                </div>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="distribution">
        <TabsList className="h-9">
          <TabsTrigger value="distribution" className="text-xs">Distribution</TabsTrigger>
          <TabsTrigger value="subcategories" className="text-xs">Sub-Categories</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard
              title="By Region" description="Contact distribution across regions"
              data={byRegion} type="bar" dataKey="count" nameKey="name" idKey="id"
              filterType="region" onDrilldown={openDrilldown("region")}
              onExport={() => exportChartCSV(byRegion, "contacts-by-region.csv")} isLoading={isLoading}
            />
            <ChartCard
              title="By Source" description="How contacts were sourced"
              data={bySource} type="pie" dataKey="count" nameKey="name" idKey="id"
              filterType="source" onDrilldown={openDrilldown("source")}
              onExport={() => exportChartCSV(bySource, "contacts-by-source.csv")} isLoading={isLoading}
            />
          </div>
        </TabsContent>

        <TabsContent value="subcategories" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard
              title="By Vendor Sub-Category" description="Breakdown within vendor categories"
              data={byVendorSub} type="bar" dataKey="count" nameKey="name" idKey="id"
              filterType="vendorSubcategory" onDrilldown={openDrilldown("vendorSubcategory")}
              onExport={() => exportChartCSV(byVendorSub, "contacts-by-vendor-sub.csv")} isLoading={isLoading}
            />
            <ChartCard
              title="By Client Sub-Category" description="Breakdown within client categories"
              data={byClientSub} type="bar" dataKey="count" nameKey="name" idKey="id"
              filterType="clientSubcategory" onDrilldown={openDrilldown("clientSubcategory")}
              onExport={() => exportChartCSV(byClientSub, "contacts-by-client-sub.csv")} isLoading={isLoading}
            />
            <ChartCard
              title="By Consultant Sub-Category" description="Contacts per consultant type"
              data={byConsultantSub} type="bar" dataKey="count" nameKey="name" idKey="id"
              filterType="consultantSubcategory" onDrilldown={openDrilldown("consultantSubcategory")}
              onExport={() => exportChartCSV(byConsultantSub, "contacts-by-consultant-sub.csv")} isLoading={isLoading}
            />
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="grid grid-cols-1 gap-4">
            <ChartCard
              title="Upload Activity" description="Contact uploads over time"
              data={byActivity} type="line" dataKey="count" nameKey="date"
              onExport={() => exportChartCSV(byActivity, "upload-activity.csv")} isLoading={isLoading}
            />
          </div>
        </TabsContent>
      </Tabs>

      {drilldown && <DrilldownSheet state={drilldown} onClose={() => setDrilldown(null)} />}
    </div>
  );
}
