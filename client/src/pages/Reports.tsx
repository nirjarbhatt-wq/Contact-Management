import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, BarChart3, PieChart, TrendingUp, Users } from "lucide-react";
import {
  PieChart as RechartsPie, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#818cf8", "#4f46e5", "#7c3aed", "#5b21b6", "#4338ca"];

function exportChartCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [headers, ...data.map(r => headers.map(h => r[h]))].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function ChartCard({ title, description, data, type, dataKey, nameKey, onExport, isLoading }: {
  title: string; description?: string; data: any[]; type: "pie" | "bar" | "line";
  dataKey: string; nameKey: string; onExport: () => void; isLoading: boolean;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {description && <CardDescription className="text-xs mt-0.5">{description}</CardDescription>}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onExport} disabled={!data.length}>
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
              <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => [v, "Contacts"]} />
            </RechartsPie>
          </ResponsiveContainer>
        ) : type === "bar" ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey={nameKey} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: any) => [v, "Contacts"]} />
              <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
  const { data: overview, isLoading: l0 } = trpc.reports.overview.useQuery();
  const { data: byRegion = [], isLoading: l1 } = trpc.reports.byRegion.useQuery();
  const { data: byVendor = [], isLoading: l2 } = trpc.reports.byVendor.useQuery();
  const { data: byVendorSub = [], isLoading: l3 } = trpc.reports.byVendorSubcategory.useQuery();
  const { data: byClient = [], isLoading: l4 } = trpc.reports.byClient.useQuery();
  const { data: byClientSub = [], isLoading: l5 } = trpc.reports.byClientSubcategory.useQuery();
  const { data: byConsultant = [], isLoading: l6 } = trpc.reports.byConsultant.useQuery();
  const { data: bySource = [], isLoading: l7 } = trpc.reports.bySource.useQuery();
  const { data: byActivity = [], isLoading: l8 } = trpc.reports.uploadActivity.useQuery();
  const isLoading = l0 || l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8;

  const summaryCards = [
    { label: "Total Contacts", value: overview?.totalContacts ?? 0, icon: Users },
    { label: "Regions Covered", value: byRegion.length, icon: BarChart3 },
    { label: "Active Vendors", value: byVendor.length, icon: TrendingUp },
    { label: "Active Clients", value: byClient.length, icon: PieChart },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Reports & Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Visualize contact distribution across all dimensions.</p>
      </div>

      {/* Summary Cards */}
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
            <ChartCard title="By Region" description="Contact distribution across regions" data={byRegion} type="bar" dataKey="count" nameKey="name" onExport={() => exportChartCSV(byRegion, "contacts-by-region.csv")} isLoading={isLoading} />
            <ChartCard title="By Source" description="How contacts were sourced" data={bySource} type="pie" dataKey="count" nameKey="name" onExport={() => exportChartCSV(bySource, "contacts-by-source.csv")} isLoading={isLoading} />
            <ChartCard title="By Vendor" description="Contacts associated with vendors" data={byVendor} type="bar" dataKey="count" nameKey="name" onExport={() => exportChartCSV(byVendor, "contacts-by-vendor.csv")} isLoading={isLoading} />
            <ChartCard title="By Client" description="Contacts associated with clients" data={byClient} type="bar" dataKey="count" nameKey="name" onExport={() => exportChartCSV(byClient, "contacts-by-client.csv")} isLoading={isLoading} />
            <ChartCard title="By Consultant" description="Contacts per consultant" data={byConsultant} type="bar" dataKey="count" nameKey="name" onExport={() => exportChartCSV(byConsultant, "contacts-by-consultant.csv")} isLoading={isLoading} />
          </div>
        </TabsContent>

        <TabsContent value="subcategories" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="By Vendor Sub-Category" description="Breakdown within vendor categories" data={byVendorSub} type="bar" dataKey="count" nameKey="name" onExport={() => exportChartCSV(byVendorSub, "contacts-by-vendor-sub.csv")} isLoading={isLoading} />
            <ChartCard title="By Client Sub-Category" description="Breakdown within client categories" data={byClientSub} type="bar" dataKey="count" nameKey="name" onExport={() => exportChartCSV(byClientSub, "contacts-by-client-sub.csv")} isLoading={isLoading} />
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="grid grid-cols-1 gap-4">
            <ChartCard title="Upload Activity" description="Contact uploads over time" data={byActivity} type="line" dataKey="count" nameKey="date" onExport={() => exportChartCSV(byActivity, "upload-activity.csv")} isLoading={isLoading} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
