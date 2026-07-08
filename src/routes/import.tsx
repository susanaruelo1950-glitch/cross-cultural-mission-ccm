import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, FileJson, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  exportPayload,
  importPayload,
  resetRuntimeStore,
  type Area,
  type Missionary,
  type Phase,
} from "@/lib/mission-data";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Import Data — Cross-Cultural Mission" },
      { name: "description", content: "Bulk upload phases, areas, and missionaries via CSV or JSON." },
    ],
  }),
  component: ImportPage,
});

const SAMPLE_JSON = JSON.stringify(
  {
    phases: [{ id: "phase-2", name: "Phase 2", order: 2, description: "" }],
    areas: [{ id: "area-koronadal", phaseId: "phase-2", name: "Koronadal Area", province: "South Cotabato" }],
    missionaries: [
      {
        id: "m-sample",
        areaId: "area-koronadal",
        fullName: "Juan Dela Cruz",
        church: "Grace Community Church",
        address: "Purok 3, Koronadal, South Cotabato, Philippines",
        missionStatement: "To make disciples for the glory of God.",
        ministryFocus: "Church Planting",
        status: "Active",
      },
    ],
  },
  null,
  2,
);

const CSV_HEADERS = [
  "id","areaId","fullName","church","address","missionStatement",
  "photo","ministryFocus","status","phone","email",
  "province","municipality","barangay",
];

function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQ = false;
      else cell += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { cur.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (cell !== "" || cur.length) { cur.push(cell); rows.push(cur); cur = []; cell = ""; }
        if (c === "\r" && text[i + 1] === "\n") i++;
      } else cell += c;
    }
  }
  if (cell !== "" || cur.length) { cur.push(cell); rows.push(cur); }
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((v) => v.trim() !== "")).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = (r[i] ?? "").trim()));
    return obj;
  });
}

function ImportPage() {
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    const t = await file.text();
    setText(t);
    toast.success(`Loaded ${file.name}`);
  }

  function doImport() {
    if (!text.trim()) { toast.error("Paste or upload data first"); return; }
    try {
      if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
        const parsed = JSON.parse(text);
        const payload = Array.isArray(parsed) ? { missionaries: parsed } : parsed;
        importPayload({
          phases: payload.phases as Phase[] | undefined,
          areas: payload.areas as Area[] | undefined,
          missionaries: payload.missionaries as Missionary[] | undefined,
        });
        const counts = [
          payload.phases?.length ? `${payload.phases.length} phases` : null,
          payload.areas?.length ? `${payload.areas.length} areas` : null,
          payload.missionaries?.length ? `${payload.missionaries.length} missionaries` : null,
        ].filter(Boolean).join(", ");
        toast.success(`Imported ${counts || "data"}`);
      } else {
        const rows = parseCSV(text);
        if (!rows.length) { toast.error("No rows found in CSV"); return; }
        const missionaries: Missionary[] = rows.map((r, i) => ({
          id: r.id || `m-import-${Date.now().toString(36)}-${i}`,
          areaId: r.areaId,
          fullName: r.fullName,
          church: r.church,
          address: r.address,
          missionStatement: r.missionStatement,
          photo: r.photo || undefined,
          ministryFocus: (r.ministryFocus as Missionary["ministryFocus"]) || undefined,
          status: (r.status as Missionary["status"]) || undefined,
          phone: r.phone || undefined,
          email: r.email || undefined,
          province: r.province || undefined,
          municipality: r.municipality || undefined,
          barangay: r.barangay || undefined,
        }));
        importPayload({ missionaries });
        toast.success(`Imported ${missionaries.length} missionaries`);
      }
      setText("");
    } catch (e) {
      toast.error(`Import failed: ${(e as Error).message}`);
    }
  }

  function download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    download("mission-data.json", JSON.stringify(exportPayload(), null, 2), "application/json");
  }
  function exportCSV() {
    const rows = exportPayload().missionaries;
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [CSV_HEADERS.join(",")].concat(
      rows.map((m) => CSV_HEADERS.map((h) => escape((m as unknown as Record<string, unknown>)[h])).join(",")),
    ).join("\n");
    download("missionaries.csv", csv, "text/csv");
  }
  function downloadTemplate() {
    const example = `${CSV_HEADERS.join(",")}\nm-001,area-bagumbayan,Juan Dela Cruz,Grace Community Church,"Purok 3, Bagumbayan, Sultan Kudarat",To make disciples for the glory of God.,,Church Planting,Active,,,Sultan Kudarat,Bagumbayan,Poblacion\n`;
    download("missionary-template.csv", example, "text/csv");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Import & Export</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Bulk-load your phases, areas, and missionaries. Accepts JSON (all three) or CSV (missionaries).
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="card-soft p-4">
          <Button variant="outline" className="w-full rounded-full" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Upload file
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            className="sr-only"
            aria-label="Upload data file"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          <p className="mt-2 text-xs text-muted-foreground">JSON or CSV. Contents load into the editor below.</p>
        </Card>
        <Card className="card-soft p-4">
          <Button variant="outline" className="w-full rounded-full" onClick={downloadTemplate}>
            <FileSpreadsheet className="h-4 w-4" /> Download CSV template
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">Recommended columns for a missionary row.</p>
        </Card>
        <Card className="card-soft p-4">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="rounded-full" onClick={exportJSON}>
              <Download className="h-4 w-4" /> JSON
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={exportCSV}>
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Export current data (seed + your additions).</p>
        </Card>
      </div>

      <Card className="card-soft p-5">
        <label htmlFor="import-text" className="mb-2 flex items-center gap-2 text-sm font-medium">
          <FileJson className="h-4 w-4" /> Paste JSON or CSV
        </label>
        <Textarea
          id="import-text"
          rows={12}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={SAMPLE_JSON}
          className="font-mono text-xs"
        />
        <div className="mt-4 flex flex-wrap justify-between gap-2">
          <Button
            variant="ghost"
            className="rounded-full text-destructive"
            onClick={() => {
              if (confirm("Delete all imported data and revert to seed?")) {
                resetRuntimeStore();
                toast.success("Runtime data cleared");
              }
            }}
          >
            Reset to seed
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setText(SAMPLE_JSON)}>
              Fill sample JSON
            </Button>
            <Button className="rounded-full" onClick={doImport}>
              <Upload className="h-4 w-4" /> Import
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
