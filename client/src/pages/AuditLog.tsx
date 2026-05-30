import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  upload: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  edit: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  delete: "bg-red-500/10 text-red-600 border-red-500/20",
};

export default function AuditLog() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.audit.list.useQuery({ page, pageSize: 50 });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Access Restricted</h2>
          <p className="text-muted-foreground text-sm mt-1">Audit logs are only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-display">Audit Log</h1>
        <p className="text-muted-foreground text-sm mt-1">Track all contact uploads, edits, and deletions across the team.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <p className="text-sm text-muted-foreground">{total} total action{total !== 1 ? "s" : ""} recorded</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Timestamp</TableHead>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="text-xs">Contact</TableHead>
                  <TableHead className="text-xs">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))}
                {!isLoading && logs.map((log: any) => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="text-sm font-medium">{log.userName ?? "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{log.userEmail ?? ""}</div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium capitalize ${ACTION_COLORS[log.action] ?? ""}`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-sm">{log.contactName ?? "—"}</TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground max-w-xs truncate">{log.details ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {!isLoading && logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No audit logs yet</p>
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
    </div>
  );
}
