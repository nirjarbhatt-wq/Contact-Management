import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Download, FileText, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useMetadata } from "@/hooks/useMetadata";

// CSV template columns
const TEMPLATE_HEADERS = [
  "displayName",
  "firstName",
  "lastName",
  "phoneNumbers",
  "emails",
  "regionName",
  "category",
  "subcategoryName",
  "sourceName",
  "notes",
];

function downloadTemplate() {
  const exampleRows = [
    [
      "John Doe",
      "John",
      "Doe",
      "+91-9876543210",
      "john@example.com",
      "Maharashtra",
      "Vendor",
      "IT Services",
      "LinkedIn",
      "Met at conference",
    ],
  ];
  const csv = [TEMPLATE_HEADERS.join(","), ...exampleRows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "contacts_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type ParsedRow = {
  displayName: string;
  firstName?: string;
  lastName?: string;
  phoneNumbers?: string[];
  emails?: string[];
  regionId?: number;
  vendorCategoryId?: number;
  vendorSubcategoryId?: number;
  clientCategoryId?: number;
  clientSubcategoryId?: number;
  consultantCategoryId?: number;
  consultantSubcategoryId?: number;
  contactSourceId?: number;
  notes?: string;
  // raw for display
  _regionName?: string;
  _category?: string;
  _subcategoryName?: string;
  _sourceName?: string;
};

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const cols: string[] = [];
    let inQuote = false;
    let cur = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  });
}

export default function ImportContacts() {
  const { regions, categories, subcategories, contactSources } = useMetadata();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const importMutation = trpc.contacts.importCSV.useMutation({
    onSuccess: (result) => {
      toast.success(`Import complete: ${result.inserted} inserted, ${result.skipped} skipped`);
      utils.contacts.list.invalidate();
      utils.reports.dashboard.invalidate();
      setRows([]);
      setFileName("");
      setErrors([]);
    },
    onError: (err) => toast.error(err.message),
  });

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const allRows = parseCSV(text);
      if (allRows.length < 2) {
        setErrors(["CSV has no data rows"]);
        setRows([]);
        return;
      }
      const headers = allRows[0]!.map(h => h.toLowerCase().replace(/\s+/g, ""));
      const dataRows = allRows.slice(1);
      const errs: string[] = [];
      const parsed: ParsedRow[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const r = dataRows[i]!;
        const get = (col: string) => {
          const idx = headers.indexOf(col);
          return idx >= 0 ? (r[idx] ?? "").trim() : "";
        };

        const displayName = get("displayname");
        if (!displayName) { errs.push(`Row ${i + 2}: displayName is required`); continue; }

        const regionName = get("regionname");
        const region = regions.find(rg => rg.name.toLowerCase() === regionName.toLowerCase());
        if (regionName && !region) errs.push(`Row ${i + 2}: unknown region "${regionName}"`);

        const categoryRaw = get("category").toLowerCase();
        const cat = categories.find(c => c.type === categoryRaw || c.name.toLowerCase() === categoryRaw);

        const subcategoryName = get("subcategoryname");
        const sub = subcategoryName && cat
          ? subcategories.find(s => s.categoryId === cat.id && s.name.toLowerCase() === subcategoryName.toLowerCase())
          : undefined;
        if (subcategoryName && cat && !sub) errs.push(`Row ${i + 2}: unknown subcategory "${subcategoryName}" for ${cat.name}`);

        const sourceName = get("sourcename");
        const source = contactSources.find(s => s.name.toLowerCase() === sourceName.toLowerCase());
        if (sourceName && !source) errs.push(`Row ${i + 2}: unknown source "${sourceName}"`);

        const phones = get("phonenumbers").split(";").map(p => p.trim()).filter(Boolean);
        const emails = get("emails").split(";").map(e => e.trim()).filter(Boolean);

        const row: ParsedRow = {
          displayName,
          firstName: get("firstname") || undefined,
          lastName: get("lastname") || undefined,
          phoneNumbers: phones.length > 0 ? phones : undefined,
          emails: emails.length > 0 ? emails : undefined,
          regionId: region?.id,
          notes: get("notes") || undefined,
          _regionName: regionName,
          _category: get("category"),
          _subcategoryName: subcategoryName,
          _sourceName: sourceName,
        };

        if (cat && sub) {
          if (cat.type === "vendor") {
            row.vendorCategoryId = cat.id;
            row.vendorSubcategoryId = sub.id;
          } else if (cat.type === "client") {
            row.clientCategoryId = cat.id;
            row.clientSubcategoryId = sub.id;
          } else {
            row.consultantCategoryId = cat.id;
            row.consultantSubcategoryId = sub.id;
          }
        } else if (cat) {
          if (cat.type === "vendor") row.vendorCategoryId = cat.id;
          else if (cat.type === "client") row.clientCategoryId = cat.id;
          else row.consultantCategoryId = cat.id;
        }

        if (source) row.contactSourceId = source.id;
        parsed.push(row);
      }

      setErrors(errs);
      setRows(parsed);
    };
    reader.readAsText(file);
  }, [regions, categories, subcategories, contactSources]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleSubmit = () => {
    if (rows.length === 0) return;
    const payload = rows.map(({ _regionName, _category, _subcategoryName, _sourceName, ...r }) => r);
    importMutation.mutate(payload);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Import Contacts</h1>
          <p className="text-sm text-muted-foreground">Upload a CSV file to bulk-import contacts</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
          <Download className="h-4 w-4" />
          Download Template
        </Button>
      </div>

      {/* Instructions */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-indigo-400" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">CSV Format Guide</p>
              <p>Required column: <code className="rounded bg-white/10 px-1 text-xs">displayName</code></p>
              <p>Optional columns: <code className="rounded bg-white/10 px-1 text-xs">firstName</code>, <code className="rounded bg-white/10 px-1 text-xs">lastName</code>, <code className="rounded bg-white/10 px-1 text-xs">phoneNumbers</code> (semicolon-separated), <code className="rounded bg-white/10 px-1 text-xs">emails</code> (semicolon-separated), <code className="rounded bg-white/10 px-1 text-xs">regionName</code>, <code className="rounded bg-white/10 px-1 text-xs">category</code> (Vendor/Client/Consultant), <code className="rounded bg-white/10 px-1 text-xs">subcategoryName</code>, <code className="rounded bg-white/10 px-1 text-xs">sourceName</code>, <code className="rounded bg-white/10 px-1 text-xs">notes</code></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragging ? "border-indigo-400 bg-indigo-500/10" : "border-white/20 hover:border-white/40 hover:bg-white/5"
        }`}
      >
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        {fileName ? (
          <p className="text-sm font-medium">{fileName}</p>
        ) : (
          <>
            <p className="text-sm font-medium">Drop your CSV here or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">Supports .csv files only</p>
          </>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />
              {errors.length} warning{errors.length > 1 ? "s" : ""} found
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ul className="space-y-1">
              {errors.map((e, i) => (
                <li key={i} className="text-xs text-red-300">{e}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Preview Table */}
      {rows.length > 0 && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                Preview — {rows.length} contact{rows.length > 1 ? "s" : ""} ready
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setRows([]); setFileName(""); setErrors([]); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Phone</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Region</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((r, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-2 font-medium">{r.displayName}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.phoneNumbers?.[0] ?? "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.emails?.[0] ?? "—"}</td>
                    <td className="px-4 py-2">
                      {r._regionName ? (
                        <Badge variant="outline" className="text-xs">{r._regionName}</Badge>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {r._category ? (
                        <span className="text-xs">
                          {r._category}{r._subcategoryName ? ` / ${r._subcategoryName}` : ""}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{r._sourceName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 20 && (
              <p className="px-4 py-2 text-xs text-muted-foreground">
                Showing first 20 of {rows.length} rows
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      {rows.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={importMutation.isPending}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <Upload className="h-4 w-4" />
            {importMutation.isPending ? "Importing…" : `Import ${rows.length} Contact${rows.length > 1 ? "s" : ""}`}
          </Button>
        </div>
      )}
    </div>
  );
}
