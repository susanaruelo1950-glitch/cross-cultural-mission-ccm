import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Download, BarChart3, FileDown, Loader2 } from "lucide-react";
import {
  allAreas,
  allMissionaries,
  allPhases,
  JOURNEY_STAGES,
  missionStats,
  type JourneyStage,
} from "@/lib/mission-data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Annual Analytics — Great Commission" },
      {
        name: "description",
        content:
          "Annual ministry analytics: missionaries by phase, area, ministry focus, and journey stage — with CSV export.",
      },
    ],
  }),
  component: Analytics,
});

const PALETTE = [
  "oklch(0.55 0.15 245)",
  "oklch(0.62 0.14 165)",
  "oklch(0.68 0.13 60)",
  "oklch(0.60 0.16 15)",
  "oklch(0.58 0.14 300)",
  "oklch(0.50 0.13 210)",
  "oklch(0.70 0.13 100)",
  "oklch(0.55 0.15 340)",
];

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function Analytics() {
  const year = new Date().getFullYear();
  const missionaries = allMissionaries();
  const phases = allPhases();
  const areas = allAreas();
  const chartsRef = useRef<HTMLDivElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const byPhase = useMemo(
    () =>
      phases.map((p) => ({
        name: p.name.replace(/^Phase \d+ — /, ""),
        value: missionaries.filter((m) => areas.find((a) => a.id === m.areaId)?.phaseId === p.id)
          .length,
      })),
    [phases, areas, missionaries],
  );

  const byArea = useMemo(
    () =>
      areas.map((a) => ({
        name: a.name.replace(/ Area$/, ""),
        value: missionaries.filter((m) => m.areaId === a.id).length,
      })),
    [areas, missionaries],
  );

  const byFocus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of missionaries) {
      const k = m.ministryFocus ?? "Unspecified";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [missionaries]);

  const byStage = useMemo(() => {
    const counts: Record<JourneyStage | "Unspecified", number> = {} as never;
    for (const s of JOURNEY_STAGES) counts[s] = 0;
    for (const m of missionaries) {
      const k = (m.journeyStage ?? "Church Planting") as JourneyStage;
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return JOURNEY_STAGES.map((s) => ({ name: s, value: counts[s] ?? 0 }));
  }, [missionaries]);

  function exportReport() {
    const rows: (string | number)[][] = [];
    rows.push([`Great Commission — Annual Ministry Report ${year}`]);
    rows.push([`Generated`, new Date().toISOString()]);
    rows.push([]);
    rows.push(["Summary"]);
    rows.push(["Total missionaries", missionStats.totalMissionaries]);
    rows.push(["Total phases", missionStats.totalPhases]);
    rows.push(["Total areas", missionStats.totalAreas]);
    rows.push(["Total churches", missionStats.totalChurches]);
    rows.push(["Active missionaries", missionStats.totalActive]);
    rows.push(["Churches planted", missionStats.totalChurchesPlanted]);
    rows.push(["Baptisms", missionStats.totalBaptisms]);
    rows.push(["Leaders trained", missionStats.totalLeadersTrained]);
    rows.push([]);
    rows.push(["Missionaries by phase"]);
    rows.push(["Phase", "Count"]);
    for (const r of byPhase) rows.push([r.name, r.value]);
    rows.push([]);
    rows.push(["Missionaries by area"]);
    rows.push(["Area", "Count"]);
    for (const r of byArea) rows.push([r.name, r.value]);
    rows.push([]);
    rows.push(["Ministry focus distribution"]);
    rows.push(["Focus", "Count"]);
    for (const r of byFocus) rows.push([r.name, r.value]);
    rows.push([]);
    rows.push(["Mission journey stages"]);
    rows.push(["Stage", "Count"]);
    for (const r of byStage) rows.push([r.name, r.value]);
    rows.push([]);
    rows.push(["Full roster"]);
    rows.push([
      "Full Name",
      "Church",
      "Address",
      "Phase",
      "Area",
      "Ministry Focus",
      "Journey Stage",
      "Status",
    ]);
    for (const m of missionaries) {
      const a = areas.find((x) => x.id === m.areaId);
      const p = phases.find((x) => x.id === a?.phaseId);
      rows.push([
        m.fullName,
        m.church,
        m.address,
        p?.name ?? "",
        a?.name ?? "",
        m.ministryFocus ?? "",
        m.journeyStage ?? "",
        m.status ?? "",
      ]);
    }
    downloadCsv(`great-commission-annual-report-${year}.csv`, rows);
  }

  async function exportPdf() {
    if (!chartsRef.current) return;
    setPdfBusy(true);
    try {
      const [{ default: jsPDF }, autoTableMod, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
        import("html2canvas"),
      ]);
      const autoTable = (autoTableMod as unknown as { default: typeof import("jspdf-autotable").default }).default;
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // ── Cover page ────────────────────────────
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, pageH, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("GREAT COMMISSION", pageW / 2, pageH / 2 - 100, { align: "center" });
      doc.setFontSize(34);
      doc.text("Annual Ministry Report", pageW / 2, pageH / 2 - 40, { align: "center" });
      doc.setFontSize(48);
      doc.setTextColor(148, 197, 255);
      doc.text(String(year), pageW / 2, pageH / 2 + 30, { align: "center" });
      doc.setFontSize(12);
      doc.setTextColor(200, 210, 230);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${missionStats.totalMissionaries} missionaries · ${missionStats.totalAreas} areas · ${missionStats.totalChurches} churches`,
        pageW / 2,
        pageH / 2 + 70,
        { align: "center" },
      );
      doc.setFontSize(10);
      doc.text(`Generated ${new Date().toLocaleDateString()}`, pageW / 2, pageH - 60, {
        align: "center",
      });

      // ── Summary page ──────────────────────────
      doc.addPage();
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Summary", 40, 60);
      autoTable(doc, {
        startY: 80,
        head: [["Metric", "Value"]],
        body: [
          ["Total missionaries", String(missionStats.totalMissionaries)],
          ["Total phases", String(missionStats.totalPhases)],
          ["Total areas", String(missionStats.totalAreas)],
          ["Total churches", String(missionStats.totalChurches)],
          ["Active missionaries", String(missionStats.totalActive)],
          ["Churches planted", String(missionStats.totalChurchesPlanted)],
          ["Baptisms", String(missionStats.totalBaptisms)],
          ["Leaders trained", String(missionStats.totalLeadersTrained)],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 58, 138] },
      });

      // ── Charts (rasterized) ──────────────────
      const canvas = await html2canvas(chartsRef.current, {
        backgroundColor: "#ffffff",
        scale: 1.5,
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const imgW = pageW - 80;
      const imgH = (canvas.height * imgW) / canvas.width;
      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Charts", 40, 60);
      let y = 80;
      let remaining = imgH;
      let sourceY = 0;
      const pageAvail = pageH - 100;
      // Slice the tall image across pages
      while (remaining > 0) {
        const sliceH = Math.min(remaining, pageAvail);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = (sliceH * canvas.width) / imgW;
        const ctx = sliceCanvas.getContext("2d");
        if (!ctx) break;
        ctx.drawImage(
          canvas,
          0,
          (sourceY * canvas.width) / imgW,
          canvas.width,
          sliceCanvas.height,
          0,
          0,
          canvas.width,
          sliceCanvas.height,
        );
        doc.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 40, y, imgW, sliceH);
        remaining -= sliceH;
        sourceY += sliceH;
        if (remaining > 0) {
          doc.addPage();
          y = 40;
        }
      }
      // Undo the extra "Charts" heading page if empty — already used, fine.
      void imgData;

      // ── Roster page ──────────────────────────
      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Missionary Roster", 40, 60);
      autoTable(doc, {
        startY: 80,
        head: [["Name", "Church", "Phase", "Area", "Focus", "Stage"]],
        body: missionaries.map((m) => {
          const a = areas.find((x) => x.id === m.areaId);
          const p = phases.find((x) => x.id === a?.phaseId);
          return [
            m.fullName,
            m.church,
            p?.name.replace(/^Phase \d+ — /, "") ?? "",
            a?.name ?? "",
            m.ministryFocus ?? "",
            m.journeyStage ?? "",
          ];
        }),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [30, 58, 138] },
      });

      doc.save(`great-commission-annual-report-${year}.pdf`);
      toast.success("PDF report ready.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to build PDF.");
    } finally {
      setPdfBusy(false);
    }
  }


  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">
            Annual Analytics — {year}
          </h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Ministry metrics compiled from the entire missionary directory.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportReport} variant="outline" className="rounded-full">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button onClick={exportPdf} disabled={pdfBusy} className="rounded-full">
            {pdfBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Building PDF…
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" /> PDF (with charts)
              </>
            )}
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Missionaries" value={missionStats.totalMissionaries} icon={BarChart3} />
        <StatCard label="Areas" value={missionStats.totalAreas} icon={BarChart3} />
        <StatCard label="Churches" value={missionStats.totalChurches} icon={BarChart3} />
        <StatCard label="Provinces reached" value={missionStats.totalProvinces} icon={BarChart3} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-soft p-6">
          <h2 className="font-display text-lg font-semibold">Missionaries by phase</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byPhase} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                  {byPhase.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="card-soft p-6">
          <h2 className="font-display text-lg font-semibold">Missionaries by area</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byArea}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill={PALETTE[0]} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="card-soft p-6">
          <h2 className="font-display text-lg font-semibold">Ministry focus</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byFocus} dataKey="value" nameKey="name" outerRadius={90}>
                  {byFocus.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="card-soft p-6">
          <h2 className="font-display text-lg font-semibold">Mission journey stages</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStage}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={80} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill={PALETTE[1]} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
