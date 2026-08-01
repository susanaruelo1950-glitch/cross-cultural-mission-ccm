import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  Database,
  ExternalLink,
  Printer,
  FileText,
  FileType2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDataStore } from "@/hooks/use-data-store";
import { useDirectory } from "@/hooks/use-directory";
import { ALL, useSharedFilters } from "@/hooks/use-shared-filters";
import { LiveUpdatesIndicator } from "@/components/LiveUpdatesIndicator";
import {
  exportDirectoryDocx,
  exportDirectoryPdf,
  type ExportGroup,
} from "@/lib/directory-export";
import type { Missionary } from "@/lib/mission-data";

export const Route = createFileRoute("/records")({
  head: () => ({
    meta: [
      { title: "Master Records — Cross-Cultural Ministry" },
      {
        name: "description",
        content:
          "Complete data directory of every Cross-Cultural Ministry church planter pastor: mission statements, family, location, support, and ministry fruit in one place.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Master Records — Cross-Cultural Ministry" },
      {
        property: "og:description",
        content:
          "Every detail of every missionary in one searchable, exportable record book.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Master Records — Cross-Cultural Ministry" },
      {
        name: "twitter:description",
        content:
          "Every detail of every missionary in one searchable, exportable record book.",
      },
    ],
  }),
  component: RecordsPage,
});

type Row = { label: string; value: string };

function fmtMoney(n?: number) {
  if (n == null) return "";
  return `PHP ${n.toLocaleString()}`;
}

function joinList(v?: string[]) {
  return v && v.length ? v.join(", ") : "";
}

function buildSections(m: Missionary, areaName: string, phaseName: string) {
  const sections: { title: string; rows: Row[] }[] = [
    {
      title: "Identity & Calling",
      rows: [
        { label: "Full name", value: m.fullName },
        { label: "Record ID", value: m.id },
        { label: "Church", value: m.church },
        { label: "Status", value: m.status ?? "" },
        { label: "Journey stage", value: m.journeyStage ?? "" },
        { label: "Ministry focus", value: m.ministryFocus ?? "" },
        { label: "Mission statement", value: m.missionStatement },
        { label: "Vision", value: m.vision ?? "" },
        { label: "Life verse", value: m.lifeVerse ?? "" },
        { label: "Bio", value: m.bio ?? "" },
      ],
    },
    {
      title: "Assignment & Location",
      rows: [
        { label: "Phase", value: phaseName },
        { label: "Area", value: areaName },
        { label: "Address", value: m.address },
        { label: "Barangay", value: m.barangay ?? "" },
        { label: "Municipality", value: m.municipality ?? "" },
        { label: "Province", value: m.province ?? "" },
        { label: "Region", value: m.region ?? "" },
        { label: "Country", value: m.country ?? "" },
        { label: "GPS", value: m.gps ? `${m.gps[0]}, ${m.gps[1]}` : "" },
      ],
    },
    {
      title: "Contact",
      rows: [
        { label: "Phone", value: m.phone ?? "" },
        { label: "Email", value: m.email ?? "" },
        { label: "Facebook", value: m.facebook ?? "" },
      ],
    },
    {
      title: "Family",
      rows: [
        { label: "Spouse", value: m.spouse ?? "" },
        { label: "Children", value: joinList(m.children) },
        { label: "Birthday", value: m.birthday ?? "" },
        { label: "Anniversary", value: m.anniversary ?? "" },
      ],
    },
    {
      title: "People Reached",
      rows: [
        { label: "People group", value: m.peopleGroup ?? "" },
        { label: "Ethnic group", value: m.ethnicGroup ?? "" },
        { label: "Languages", value: joinList(m.languages) },
        { label: "Religious background", value: m.religiousBackground ?? "" },
        {
          label: "Population reached",
          value: m.populationReached != null ? String(m.populationReached) : "",
        },
      ],
    },
    {
      title: "Sending & Support",
      rows: [
        { label: "Sending church", value: m.sendingChurch ?? "" },
        { label: "Sending pastor", value: m.sendingPastor ?? "" },
        { label: "Mission agency", value: m.missionAgency ?? "" },
        { label: "Date sent", value: m.dateSent ?? "" },
        { label: "Monthly support needed", value: fmtMoney(m.monthlySupportNeeded) },
        { label: "Support received", value: fmtMoney(m.supportReceived) },
        { label: "Needs", value: joinList(m.needs) },
      ],
    },
    {
      title: "Ministry Fruit",
      rows: [
        {
          label: "Churches planted",
          value: m.churchesPlanted != null ? String(m.churchesPlanted) : "",
        },
        { label: "Baptisms", value: m.baptisms != null ? String(m.baptisms) : "" },
        {
          label: "Bible studies",
          value: m.bibleStudies != null ? String(m.bibleStudies) : "",
        },
        {
          label: "Leaders trained",
          value: m.leadersTrained != null ? String(m.leadersTrained) : "",
        },
      ],
    },
  ];
  return sections;
}

function csvEscape(v: string) {
  return `"${v.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

type GroupKey = "region" | "province" | "phase" | "area" | "ministry" | "none";

const GROUP_LABELS: Record<GroupKey, string> = {
  region: "Region",
  province: "Province",
  phase: "Batch / Phase",
  area: "Area assignment",
  ministry: "Ministry focus",
  none: "No grouping",
};


function RecordsPage() {
  const { missionaries } = useDataStore();
  const { phases, areas, regions, provinces } = useDirectory();
  const { filters, setFilters } = useSharedFilters();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [allOpen, setAllOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupKey>("region");
  const [busy, setBusy] = useState<"pdf" | "docx" | null>(null);

  const areaById = useMemo(() => {
    const map = new Map<string, (typeof areas)[number]>();
    for (const a of areas) map.set(a.id, a);
    return map;
  }, [areas]);
  const phaseById = useMemo(() => {
    const map = new Map<string, (typeof phases)[number]>();
    for (const p of phases) map.set(p.id, p);
    return map;
  }, [phases]);

  const regionName = regions.find((r) => r.id === filters.regionId)?.name;
  const provinceName = provinces.find((p) => p.id === filters.provinceId)?.name;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return missionaries
      .map((m) => {
        const area = areaById.get(m.areaId);
        const phase = area ? phaseById.get(area.phaseId) : undefined;
        return {
          m,
          areaName: area?.name ?? m.areaId,
          phaseName: phase?.name ?? "",
          area,
        };
      })
      .filter(({ m, area }) => {
        if (filters.phaseId !== ALL && area?.phaseId !== filters.phaseId) return false;
        if (
          filters.regionId !== ALL &&
          area?.region !== filters.regionId &&
          area?.region !== regionName
        )
          return false;
        if (
          filters.provinceId !== ALL &&
          area?.province !== filters.provinceId &&
          area?.province !== provinceName
        )
          return false;
        if (!needle) return true;
        const hay = JSON.stringify(m).toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => a.m.fullName.localeCompare(b.m.fullName));
  }, [
    missionaries,
    areaById,
    phaseById,
    q,
    filters.phaseId,
    filters.regionId,
    filters.provinceId,
    regionName,
    provinceName,
  ]);


  // Organised view: region, batch/phase, ministry assignment, area, or flat.
  const grouped = useMemo(() => {
    if (groupBy === "none") {
      return [{ title: `All missionaries`, items: rows }];
    }
    const buckets = new Map<string, typeof rows>();
    for (const r of rows) {
      let key = "Unassigned";
      if (groupBy === "region") key = r.area?.region || r.m.region || "Unassigned region";
      else if (groupBy === "province") key = r.area?.province || r.m.province || "Unassigned province";
      else if (groupBy === "phase") key = r.phaseName || "Unassigned batch";
      else if (groupBy === "area") key = r.areaName || "Unassigned area";
      else if (groupBy === "ministry") key = r.m.ministryFocus || "Unspecified ministry";
      const list = buckets.get(key) ?? [];
      list.push(r);
      buckets.set(key, list);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([title, items]) => ({ title, items }));
  }, [rows, groupBy]);

  function toExportGroups(): ExportGroup[] {
    return grouped.map((g) => ({
      title: g.title,
      rows: g.items.map(({ m, areaName, phaseName }) => ({
        name: m.fullName,
        subtitle: [m.church, m.municipality, m.province].filter(Boolean).join(" · "),
        sections: buildSections(m, areaName, phaseName),
      })),
    }));
  }

  async function runExport(kind: "pdf" | "docx") {
    if (rows.length === 0) {
      toast.error("Nothing to export with the current filters.");
      return;
    }
    setBusy(kind);
    try {
      const meta = {
        title: "Cross-Cultural Ministry — Missionary Directory",
        subtitle: "Complete records of commissioned church planter pastors",
        groupedBy: GROUP_LABELS[groupBy],
        total: rows.length,
      };
      const groups = toExportGroups();
      if (kind === "pdf") await exportDirectoryPdf(groups, meta);
      else await exportDirectoryDocx(groups, meta);
      toast.success(`Directory exported as ${kind.toUpperCase()}.`);
    } catch (e) {
      toast.error(`Export failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  function exportCsv() {
    if (rows.length === 0) return;
    const sample = buildSections(rows[0].m, "", "");
    const headers = sample.flatMap((s) => s.rows.map((r) => `${s.title} — ${r.label}`));
    const lines = [headers.map(csvEscape).join(",")];
    for (const { m, areaName, phaseName } of rows) {
      const vals = buildSections(m, areaName, phaseName).flatMap((s) =>
        s.rows.map((r) => r.value ?? ""),
      );
      lines.push(vals.map(csvEscape).join(","));
    }
    downloadBlob(
      new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }),
      "missionary-master-records.csv",
    );
  }

  function exportJson() {
    const payload = rows.map(({ m, areaName, phaseName }) => ({
      ...m,
      areaName,
      phaseName,
    }));
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
      "missionary-master-records.json",
    );
  }

  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleAll() {
    const next = !allOpen;
    setAllOpen(next);
    const map: Record<string, boolean> = {};
    if (next) for (const { m } of rows) map[m.id] = true;
    setOpen(map);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Master Records</h1>
          <p className="max-w-2xl text-muted-foreground">
            Every detail of every missionary — mission statements, family, location, sending
            church, support and ministry fruit — in one searchable record book you can export.
          </p>
          <div className="mt-2 print:hidden">
            <LiveUpdatesIndicator />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button
            size="sm"
            className="rounded-full"
            onClick={() => runExport("pdf")}
            disabled={busy !== null}
          >
            {busy === "pdf" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            PDF
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full"
            onClick={() => runExport("docx")}
            disabled={busy !== null}
          >
            {busy === "docx" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileType2 className="h-4 w-4" />
            )}
            Word
          </Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={exportCsv}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={exportJson}>
            <Download className="h-4 w-4" /> JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </header>


      <div className="card-soft grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <div className="relative sm:col-span-2 lg:col-span-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search any field — name, church, spouse, people group, vision, phone..."
            className="pl-9"
          />
        </div>
        <Select value={filters.regionId} onValueChange={(v) => setFilters({ regionId: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All regions</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.provinceId} onValueChange={(v) => setFilters({ provinceId: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Province" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All provinces</SelectItem>
            {provinces
              .filter((p) => filters.regionId === ALL || p.region_id === filters.regionId)
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select value={filters.phaseId} onValueChange={(v) => setFilters({ phaseId: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All phases</SelectItem>
            {phases.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupKey)}>
          <SelectTrigger>
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(GROUP_LABELS) as GroupKey[]).map((k) => (
              <SelectItem key={k} value={k}>
                Group by {GROUP_LABELS[k].toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="secondary"
          className="rounded-full sm:col-span-2 lg:col-span-4"
          onClick={toggleAll}
        >
          {allOpen ? "Collapse all records" : "Expand all records"}
        </Button>
      </div>


      <p className="text-sm text-muted-foreground">
        {rows.length} record{rows.length === 1 ? "" : "s"}
        {rows.length !== missionaries.length ? ` (filtered from ${missionaries.length})` : ""}
      </p>

      <div className="space-y-3">
        {rows.map(({ m, areaName, phaseName }) => {
          const isOpen = !!open[m.id];
          const sections = buildSections(m, areaName, phaseName);
          return (
            <Card key={m.id} className="card-soft overflow-hidden p-0">
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))}
                className="flex w-full items-start gap-3 p-4 text-left hover:bg-muted/40"
                aria-expanded={isOpen}
              >
                {isOpen ? (
                  <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{m.fullName}</span>
                    {m.status ? (
                      <Badge variant="secondary" className="rounded-full">
                        {m.status}
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className="rounded-full">
                      {areaName}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {m.church}
                    {m.province ? ` · ${m.province}` : ""}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm">{m.missionStatement}</p>
                </div>
              </button>

              {isOpen ? (
                <div className="border-t bg-muted/20 p-4">
                  <div className="grid gap-5 md:grid-cols-2">
                    {sections.map((s) => {
                      const filled = s.rows.filter((r) => r.value && r.value.trim());
                      if (filled.length === 0) return null;
                      return (
                        <section key={s.title} className="space-y-2">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {s.title}
                          </h3>
                          <dl className="space-y-1.5">
                            {filled.map((r) => (
                              <div key={r.label} className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
                                <dt className="text-muted-foreground">{r.label}</dt>
                                <dd className="break-words">{r.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </section>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 print:hidden">
                    <Button asChild size="sm" variant="outline" className="rounded-full">
                      <Link to="/missionaries/$id" params={{ id: m.id }}>
                        <ExternalLink className="h-4 w-4" /> Open full profile
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}

        {rows.length === 0 ? (
          <Card className="card-soft flex flex-col items-center gap-2 p-12 text-center">
            <Database className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No records match your search</p>
            <p className="text-sm text-muted-foreground">
              Try clearing the filters or searching a different term.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
