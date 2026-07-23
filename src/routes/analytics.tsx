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
      { title: "Annual Analytics — Cross-Cultural Ministry" },
      { name: "description", content: "Aggregate ministry analytics across every Cross-Cultural Ministry phase and area." },
      { property: "og:title", content: "Annual Analytics — Cross-Cultural Ministry" },
      { property: "og:description", content: "Aggregate ministry analytics across every Cross-Cultural Ministry phase and area." },
      { property: "og:url", content: "https://cross-cultural-mission-ccm.lovable.app/analytics" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp" },
      { name: "twitter:title", content: "Annual Analytics — Cross-Cultural Ministry" },
      { name: "twitter:description", content: "Aggregate ministry analytics across every Cross-Cultural Ministry phase and area." },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp" },
    ],
    links: [{ rel: "canonical", href: "https://cross-cultural-mission-ccm.lovable.app/analytics" }],
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
    rows.push([`Cross-Cultural Ministry — Annual Ministry Report ${year}`]);
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

  const [pdfStage, setPdfStage] = useState<string>("");

  async function exportPdf() {
    if (!chartsRef.current) {
      toast.error("Charts not ready yet — scroll down so charts render, then try again.");
      return;
    }
    setPdfBusy(true);
    setPdfStage("Loading PDF engine…");
    const progressToast = toast.loading("Loading PDF engine…");
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

      setPdfStage("Rendering cover & summary…");
      toast.loading("Rendering cover & summary…", { id: progressToast });
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
      setPdfStage("Rasterizing charts…");
      toast.loading("Rasterizing charts (this can take a few seconds)…", { id: progressToast });
      const canvas = await html2canvas(chartsRef.current, {
        backgroundColor: "#ffffff",
        scale: 1.5,
        useCORS: true,
      });
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

      // ── Roster page ──────────────────────────
      setPdfStage("Compiling roster…");
      toast.loading("Compiling missionary roster…", { id: progressToast });
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

      setPdfStage("Saving file…");
      doc.save(`great-commission-annual-report-${year}.pdf`);
      toast.success("PDF report ready — check your downloads.", { id: progressToast });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`PDF export failed: ${msg}. Try closing other tabs or exporting CSV instead.`, {
        id: progressToast,
      });
    } finally {
      setPdfBusy(false);
      setPdfStage("");
    }
  }



  return (
    <div className="min-w-0 space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold sm:text-4xl">
            Annual Analytics — {year}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Ministry metrics compiled from the entire missionary directory.
          </p>
        </div>
        <div className="col-span-2 flex flex-wrap gap-2">
          <Button onClick={exportReport} variant="outline" size="sm" className="rounded-full sm:h-10">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button onClick={exportPdf} disabled={pdfBusy} size="sm" className="rounded-full sm:h-10" aria-live="polite">
            {pdfBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> <span className="truncate max-w-[160px]">{pdfStage || "Building PDF…"}</span>
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" /> PDF
              </>
            )}
          </Button>
        </div>
      </header>

      <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Missionaries" value={missionStats.totalMissionaries} icon={BarChart3} />
        <StatCard label="Areas" value={missionStats.totalAreas} icon={BarChart3} />
        <StatCard label="Churches" value={missionStats.totalChurches} icon={BarChart3} />
        <StatCard label="Provinces" value={missionStats.totalProvinces} icon={BarChart3} />
      </div>


      <div ref={chartsRef} className="grid min-w-0 gap-4 bg-background sm:gap-6 lg:grid-cols-2">
        <Card className="card-soft min-w-0 p-4 sm:p-6">
          <h2 className="font-display text-base font-semibold sm:text-lg">Missionaries by phase</h2>
          <div className="mt-4 h-56 w-full sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byPhase} dataKey="value" nameKey="name" innerRadius="40%" outerRadius="70%">
                  {byPhase.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="card-soft min-w-0 p-4 sm:p-6">
          <h2 className="font-display text-base font-semibold sm:text-lg">Missionaries by area</h2>
          <div className="mt-4 h-64 w-full sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byArea} margin={{ top: 5, right: 8, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={80} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill={PALETTE[0]} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="card-soft min-w-0 p-4 sm:p-6">
          <h2 className="font-display text-base font-semibold sm:text-lg">Ministry focus</h2>
          <div className="mt-4 h-56 w-full sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byFocus} dataKey="value" nameKey="name" outerRadius="70%">
                  {byFocus.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="card-soft min-w-0 p-4 sm:p-6">
          <h2 className="font-display text-base font-semibold sm:text-lg">Mission journey stages</h2>
          <div className="mt-4 h-64 w-full sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStage} margin={{ top: 5, right: 8, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={80} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
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
