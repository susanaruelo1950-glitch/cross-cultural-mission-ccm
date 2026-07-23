import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, CheckCircle2, XCircle, FileText, Mail, Receipt, UserPlus, Megaphone, Download, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useDataStore } from "@/hooks/use-data-store";
import { supabase } from "@/integrations/supabase/client";
import { PermissionError } from "@/components/PermissionError";
import { monthLabel } from "@/lib/month-key";


export const Route = createFileRoute("/admin/monthly")({
  head: () => ({
    meta: [
      { title: "Monthly Submission Report — Cross-Cultural Ministry" },
      { name: "description", content: "See which missionaries submitted ministry updates, thank you letters, and support receipts each month." },
      { property: "og:title", content: "Monthly Submission Report — Cross-Cultural Ministry" },
      { property: "og:description", content: "Track monthly ministry updates, thank you letters, and support receipts per missionary." },
    ],
  }),
  component: MonthlyReportPage,
});

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthBounds(ym: string) {
  const [y, m] = ym.split("-").map((v) => parseInt(v, 10));
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { startISO: start.toISOString(), endISO: end.toISOString(), startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

interface Row { id: string; missionary_id: string; }
interface UpdateRow extends Row { title: string; report_date: string | null; created_at: string; }
interface LetterRow extends Row { title: string; letter_date: string; created_at: string; }
interface ReceiptRow extends Row { title: string; amount: number | null; currency: string; receipt_date: string; created_at: string; }

function MonthlyReportPage() {
  const { user, canEdit, loading } = useAuth();
  const { missionaries, areas } = useDataStore();
  const [month, setMonth] = useState<string>(currentMonthKey());
  const [query, setQuery] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<Record<string, boolean>>({});
  const [emailMessage, setEmailMessage] = useState("");

  const recipientsQ = useQuery({
    queryKey: ["monthly", "recipients"],
    queryFn: async () => {
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "coordinator"]);
      if (rolesErr) throw rolesErr;
      const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      if (!ids.length) return [] as { id: string; email: string; full_name: string | null; role: string }[];
      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", ids);
      if (profErr) throw profErr;
      const roleMap = new Map<string, string>();
      for (const r of roles ?? []) {
        // admin wins over coordinator
        if (r.role === "admin" || !roleMap.has(r.user_id)) roleMap.set(r.user_id, r.role);
      }
      return (profs ?? [])
        .filter((p) => p.email)
        .map((p) => ({ id: p.id, email: p.email as string, full_name: p.full_name, role: roleMap.get(p.id) ?? "coordinator" }))
        .sort((a, b) => (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email));
    },
    enabled: emailOpen,
    staleTime: 60_000,
  });


  const { startISO, endISO, startDate, endDate } = useMemo(() => monthBounds(month), [month]);

  const updatesQ = useQuery({
    queryKey: ["monthly", "updates", month],
    queryFn: async (): Promise<UpdateRow[]> => {
      const { data, error } = await supabase
        .from("ministry_updates")
        .select("id, missionary_id, title, report_date, created_at")
        .or(`and(report_date.gte.${startDate},report_date.lt.${endDate}),and(report_date.is.null,created_at.gte.${startISO},created_at.lt.${endISO})`);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const lettersQ = useQuery({
    queryKey: ["monthly", "letters", month],
    queryFn: async (): Promise<LetterRow[]> => {
      const { data, error } = await supabase
        .from("thank_you_letters")
        .select("id, missionary_id, title, letter_date, created_at")
        .gte("letter_date", startDate)
        .lt("letter_date", endDate);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const receiptsQ = useQuery({
    queryKey: ["monthly", "receipts", month],
    queryFn: async (): Promise<ReceiptRow[]> => {
      const { data, error } = await supabase
        .from("support_receipts")
        .select("id, missionary_id, title, amount, currency, receipt_date, created_at")
        .gte("receipt_date", startDate)
        .lt("receipt_date", endDate);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const newMissionariesQ = useQuery({
    queryKey: ["monthly", "new-missionaries", month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missionary_extras")
        .select("id, data, created_at")
        .gte("created_at", startISO)
        .lt("created_at", endISO)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((r) => {
        const d = r.data as { __deleted?: boolean } | null;
        return d && !d.__deleted;
      });
    },
    staleTime: 30_000,
  });

  const announcementsQ = useQuery({
    queryKey: ["monthly", "announcements", month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, body, publish_at, created_at, published")
        .gte("publish_at", startISO)
        .lt("publish_at", endISO)
        .order("publish_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const areaName = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);

  const rows = useMemo(() => {
    const upd = new Map<string, UpdateRow[]>();
    const let_ = new Map<string, LetterRow[]>();
    const rec = new Map<string, ReceiptRow[]>();
    for (const r of updatesQ.data ?? []) (upd.get(r.missionary_id) ?? upd.set(r.missionary_id, []).get(r.missionary_id)!).push(r);
    for (const r of lettersQ.data ?? []) (let_.get(r.missionary_id) ?? let_.set(r.missionary_id, []).get(r.missionary_id)!).push(r);
    for (const r of receiptsQ.data ?? []) (rec.get(r.missionary_id) ?? rec.set(r.missionary_id, []).get(r.missionary_id)!).push(r);

    const q = query.trim().toLowerCase();
    return missionaries
      .filter((m) => !q || m.fullName.toLowerCase().includes(q) || (m.church ?? "").toLowerCase().includes(q))
      .map((m) => {
        const u = upd.get(m.id) ?? [];
        const l = let_.get(m.id) ?? [];
        const r = rec.get(m.id) ?? [];
        const receivedAmount = r.reduce((s, x) => s + (x.amount ?? 0), 0);
        return {
          m,
          updates: u,
          letters: l,
          receipts: r,
          receivedAmount,
          hasUpdate: u.length > 0,
          hasLetter: l.length > 0,
          hasReceipt: r.length > 0,
          allSubmitted: u.length > 0 && l.length > 0 && r.length > 0,
        };
      })
      .sort((a, b) => {
        // missing items first, then alphabetical
        const aMissing = (a.hasUpdate ? 0 : 1) + (a.hasLetter ? 0 : 1) + (a.hasReceipt ? 0 : 1);
        const bMissing = (b.hasUpdate ? 0 : 1) + (b.hasLetter ? 0 : 1) + (b.hasReceipt ? 0 : 1);
        if (aMissing !== bMissing) return bMissing - aMissing;
        return a.m.fullName.localeCompare(b.m.fullName);
      });
  }, [missionaries, updatesQ.data, lettersQ.data, receiptsQ.data, query]);

  const totals = useMemo(() => {
    const withUpd = rows.filter((r) => r.hasUpdate).length;
    const withLet = rows.filter((r) => r.hasLetter).length;
    const withRec = rows.filter((r) => r.hasReceipt).length;
    const complete = rows.filter((r) => r.allSubmitted).length;
    const totalReceived = rows.reduce((s, r) => s + r.receivedAmount, 0);
    return { withUpd, withLet, withRec, complete, total: rows.length, totalReceived };
  }, [rows]);

  function exportCsv() {
    const header = ["Missionary", "Area", "Ministry Update", "Thank You Letter", "Support Receipt", "Amount Received", "All Submitted"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        `"${r.m.fullName.replace(/"/g, '""')}"`,
        `"${(areaName.get(r.m.areaId) ?? "").replace(/"/g, '""')}"`,
        r.hasUpdate ? "Yes" : "No",
        r.hasLetter ? "Yes" : "No",
        r.hasReceipt ? "Yes" : "No",
        r.receivedAmount.toString(),
        r.allSubmitted ? "Yes" : "No",
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monthly-report-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf(opts?: { save?: boolean }) {
    const save = opts?.save ?? true;
    const [{ default: jsPDF }, autoTableMod] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable = (autoTableMod as { default: (doc: unknown, opts: unknown) => void }).default;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
    const label = monthLabel(month);
    doc.setFontSize(16);
    doc.text("Monthly Submission Report", 40, 40);
    doc.setFontSize(11);
    doc.setTextColor(90);
    doc.text(`Cross-Cultural Ministry — ${label}`, 40, 58);
    doc.text(
      `Fully submitted: ${totals.complete}/${totals.total}   •   Updates: ${totals.withUpd}   •   Letters: ${totals.withLet}   •   Receipts: ${totals.withRec}   •   Received: PHP ${totals.totalReceived.toLocaleString()}`,
      40,
      74,
    );
    autoTable(doc, {
      startY: 90,
      head: [["Missionary", "Area", "Update", "Letter", "Receipt", "Received (PHP)", "All"]],
      body: rows.map((r) => [
        r.m.fullName,
        areaName.get(r.m.areaId) ?? "—",
        r.hasUpdate ? "Yes" : "No",
        r.hasLetter ? "Yes" : "No",
        r.hasReceipt ? "Yes" : "No",
        r.receivedAmount ? r.receivedAmount.toLocaleString() : "—",
        r.allSubmitted ? "Yes" : "No",
      ]),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [15, 27, 61] },
      columnStyles: {
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "right" },
        6: { halign: "center" },
      },
    });
    const newList = newMissionariesQ.data ?? [];
    const annList = announcementsQ.data ?? [];
    if (newList.length || annList.length) {
      const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 90;
      let y = lastY + 24;
      doc.setFontSize(12);
      doc.setTextColor(20);
      if (newList.length) {
        doc.text(`New missionaries this month (${newList.length})`, 40, y);
        y += 14;
        doc.setFontSize(10);
        doc.setTextColor(60);
        for (const r of newList) {
          const d = r.data as { fullName?: string; church?: string } | null;
          doc.text(
            `• ${d?.fullName ?? "Unnamed"}${d?.church ? ` — ${d.church}` : ""} (${new Date(r.created_at).toLocaleDateString()})`,
            48,
            y,
          );
          y += 12;
          if (y > 560) { doc.addPage(); y = 40; }
        }
        y += 8;
      }
      if (annList.length) {
        doc.setFontSize(12);
        doc.setTextColor(20);
        doc.text(`Announcements & approvals (${annList.length})`, 40, y);
        y += 14;
        doc.setFontSize(10);
        doc.setTextColor(60);
        for (const a of annList) {
          doc.text(
            `• ${a.title} (${new Date(a.publish_at).toLocaleDateString()})${a.published ? "" : " [Draft]"}`,
            48,
            y,
          );
          y += 12;
          if (y > 560) { doc.addPage(); y = 40; }
        }
      }
    }
    doc.save(`monthly-report-${month}.pdf`);
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <PermissionError title="Sign in required" message="Please sign in to view the monthly report." />;
  if (!canEdit) return <PermissionError title="Admins & coordinators only" message="Ask an administrator to grant you access." />;

  const loadingAny = updatesQ.isLoading || lettersQ.isLoading || receiptsQ.isLoading;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/admin"><ArrowLeft className="h-4 w-4" /> Admin</Link>
          </Button>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Monthly Submission Report</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Track which missionaries have submitted their ministry update, thank you letter, and support receipt for {monthLabel(month)}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value || currentMonthKey())}
              className="bg-transparent text-sm outline-none"
              aria-label="Report month"
            />
          </div>
          <Button variant="outline" size="sm" className="rounded-full" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={exportPdf}>
            <FileText className="h-4 w-4" /> Export PDF
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Fully submitted" value={`${totals.complete} / ${totals.total}`} tone="success" />
        <StatCard icon={FileText} label="Ministry updates" value={`${totals.withUpd} / ${totals.total}`} />
        <StatCard icon={Mail} label="Thank you letters" value={`${totals.withLet} / ${totals.total}`} />
        <StatCard icon={Receipt} label="Support received" value={`₱${totals.totalReceived.toLocaleString()}`} sub={`${totals.withRec} of ${totals.total} filed`} />
      </div>

      <Card className="card-soft p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Per-missionary status</h2>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search missionary or church…"
            className="h-9 max-w-xs rounded-full"
          />
        </div>

        {loadingAny ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading submissions…</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Missionary</th>
                  <th className="py-2 pr-3">Area</th>
                  <th className="py-2 pr-3 text-center">Update</th>
                  <th className="py-2 pr-3 text-center">Letter</th>
                  <th className="py-2 pr-3 text-center">Receipt</th>
                  <th className="py-2 pr-3 text-right">Received</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.m.id} className="border-t border-border/60 align-top">
                    <td className="py-2 pr-3">
                      <Link to="/missionaries/$id" params={{ id: r.m.id }} className="font-medium hover:text-primary">
                        {r.m.fullName}
                      </Link>
                      {r.m.church ? <div className="text-xs text-muted-foreground">{r.m.church}</div> : null}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{areaName.get(r.m.areaId) ?? "—"}</td>
                    <td className="py-2 pr-3 text-center"><StatusMark ok={r.hasUpdate} count={r.updates.length} /></td>
                    <td className="py-2 pr-3 text-center"><StatusMark ok={r.hasLetter} count={r.letters.length} /></td>
                    <td className="py-2 pr-3 text-center"><StatusMark ok={r.hasReceipt} count={r.receipts.length} /></td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {r.receivedAmount > 0 ? `₱${r.receivedAmount.toLocaleString()}` : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr><td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">No missionaries match your search.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-soft p-5">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">New missionaries this month</h2>
            <Badge variant="secondary" className="ml-auto rounded-full">{newMissionariesQ.data?.length ?? 0}</Badge>
          </div>
          {newMissionariesQ.isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
          ) : (newMissionariesQ.data?.length ?? 0) === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No new missionaries were added in {monthLabel(month)}.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {newMissionariesQ.data!.map((r) => {
                const d = r.data as { fullName?: string; church?: string; areaId?: string } | null;
                return (
                  <li key={r.id} className="flex items-baseline justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
                    <div>
                      <Link to="/missionaries/$id" params={{ id: r.id }} className="font-medium hover:text-primary">
                        {d?.fullName ?? "Unnamed missionary"}
                      </Link>
                      {d?.church ? <div className="text-xs text-muted-foreground">{d.church}</div> : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="card-soft p-5">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Announcements &amp; approvals</h2>
            <Badge variant="secondary" className="ml-auto rounded-full">{announcementsQ.data?.length ?? 0}</Badge>
          </div>
          {announcementsQ.isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
          ) : (announcementsQ.data?.length ?? 0) === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No announcements published in {monthLabel(month)}.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {announcementsQ.data!.map((a) => (
                <li key={a.id} className="rounded-lg border border-border/60 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.publish_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  {a.body ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.body}</p> : null}
                  {!a.published ? <Badge variant="outline" className="mt-1 rounded-full text-[10px]">Draft</Badge> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone }: { icon: typeof CheckCircle2; label: string; value: string; sub?: string; tone?: "success" }) {
  return (
    <Card className="card-soft p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${tone === "success" ? "text-emerald-600" : "text-primary"}`} />
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
      {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
    </Card>
  );
}

function StatusMark({ ok, count }: { ok: boolean; count: number }) {
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        <span className="text-xs">{count > 1 ? `${count}` : "Yes"}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
      <XCircle className="h-3.5 w-3.5" aria-hidden />
      <span className="text-xs">Missing</span>
    </span>
  );
}
