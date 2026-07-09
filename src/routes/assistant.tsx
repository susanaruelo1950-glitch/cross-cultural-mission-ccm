import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, Loader2, Filter } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  allAreas,
  allMissionaries,
  allPhases,
  missionStats,
  reports,
} from "@/lib/mission-data";
import { useDataStore } from "@/hooks/use-data-store";
import { useDirectory } from "@/hooks/use-directory";
import { askAssistant } from "@/lib/ask.functions";
import { supabase } from "@/integrations/supabase/client";

import { ALL, useSharedFilters } from "@/hooks/use-shared-filters";
interface Filters { regionId: string; provinceId: string; phaseId: string }


export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Mission Assistant — Cross-Cultural Mission" },
      { name: "description", content: "Ask questions grounded in Cross-Cultural Mission data — missionaries, reports, prayer." },
      { property: "og:title", content: "AI Mission Assistant — Cross-Cultural Mission" },
      { property: "og:description", content: "Ask questions grounded in Cross-Cultural Mission data — missionaries, reports, prayer." },
    ],
  }),
  component: Assistant,
});

interface Message {
  role: "user" | "assistant";
  content: string;
}

const PROMPTS = [
  "How many missionaries do we have and how are they distributed by phase?",
  "Which areas are in Sarangani or Kidapawan?",
  "Summarize the recent ministry updates.",
  "List open prayer requests and who they're for.",
  "What are the current announcements or upcoming events?",
];

interface LiveContext {
  generatedAt: string;
  counts: Record<string, number>;
  phases: Array<{ id: string; name: string; order: number }>;
  areas: Array<{ id: string; name: string; phaseId: string; region?: string; province?: string }>;
  missionaries: Array<{ id: string; name: string; church: string; areaId: string; status?: string; ministryFocus?: string; province?: string; municipality?: string }>;
  recentReports: Array<{ title: string; date?: string; salvations?: number; baptisms?: number; attendance?: number }>;
  openPrayerRequests: Array<{ title: string; detail: string | null; urgent: boolean; missionaryId: string; missionaryName?: string; created_at: string }>;
  recentUpdates: Array<{ title: string; summary: string | null; report_date: string; missionaryId: string; missionaryName?: string }>;
  recentLetters: Array<{ title: string; excerpt: string | null; letter_date: string | null; missionaryId: string; missionaryName?: string }>;
  announcements: Array<{ title: string; body: string | null; publish_at: string; expires_at: string | null }>;
  sources: string[];
}


function baseContext(): LiveContext {
  const phases = allPhases().map((p) => ({ id: p.id, name: p.name, order: p.order }));
  const areas = allAreas().map((a) => ({
    id: a.id,
    name: a.name,
    phaseId: a.phaseId,
    region: a.region,
    province: a.province,
  }));
  const missionaries = allMissionaries().map((m) => ({
    id: m.id,
    name: m.fullName,
    church: m.church,
    areaId: m.areaId,
    status: m.status,
    ministryFocus: m.ministryFocus,
    province: m.province,
    municipality: m.municipality,
  }));
  return {
    generatedAt: new Date().toISOString(),
    counts: {
      missionaries: missionStats.totalMissionaries,
      phases: missionStats.totalPhases,
      areas: missionStats.totalAreas,
      churches: missionStats.totalChurches,
    },
    phases,
    areas,
    missionaries,
    recentReports: reports.slice(0, 10).map((r) => ({
      title: r.title,
      date: r.date,
      salvations: r.salvations,
      baptisms: r.baptisms,
      attendance: r.attendance,
    })),
    openPrayerRequests: [],
    recentUpdates: [],
    recentLetters: [],
    announcements: [],
    sources: ["directory (in-app)", "reports (in-app)"],
  };
}

function applyFilters(ctx: LiveContext, f: Filters, regionName?: string, provinceName?: string): LiveContext {
  const filterActive = f.regionId !== ALL || f.provinceId !== ALL || f.phaseId !== ALL;
  if (!filterActive) return ctx;
  const areaOk = (region?: string, province?: string, phaseId?: string) => {
    if (f.phaseId !== ALL && phaseId !== f.phaseId) return false;
    if (f.regionId !== ALL && region !== f.regionId && region !== regionName) return false;
    if (f.provinceId !== ALL && province !== f.provinceId && province !== provinceName) return false;
    return true;
  };
  const areas = ctx.areas.filter((a) => areaOk(a.region, a.province, a.phaseId));
  const areaMap = new Map(ctx.areas.map((a) => [a.id, a] as const));
  const missionaries = ctx.missionaries.filter((m) => {
    const a = areaMap.get(m.areaId);
    return a ? areaOk(a.region, a.province, a.phaseId) : false;
  });
  const mids = new Set(missionaries.map((m) => m.id));
  const chips = [
    f.regionId !== ALL ? `region=${regionName ?? f.regionId}` : null,
    f.provinceId !== ALL ? `province=${provinceName ?? f.provinceId}` : null,
    f.phaseId !== ALL ? `phase=${f.phaseId}` : null,
  ].filter(Boolean).join(", ");
  return {
    ...ctx,
    areas,
    missionaries,
    openPrayerRequests: ctx.openPrayerRequests.filter((p) => mids.has(p.missionaryId)),
    recentUpdates: ctx.recentUpdates.filter((u) => mids.has(u.missionaryId)),
    recentLetters: ctx.recentLetters.filter((l) => mids.has(l.missionaryId)),
    counts: { ...ctx.counts, missionaries: missionaries.length, areas: areas.length },
    sources: [...ctx.sources, `filters: ${chips}`],
  };
}



async function fetchLive(): Promise<LiveContext> {
  const ctx = baseContext();
  const nameById = new Map(ctx.missionaries.map((m) => [m.id, m.name]));

  const [prayers, updates, letters, anns] = await Promise.all([
    supabase
      .from("prayer_requests_db")
      .select("missionary_id, title, detail, urgent, answered, created_at")
      .eq("answered", false)
      .order("urgent", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("ministry_updates")
      .select("missionary_id, title, summary, report_date")
      .order("report_date", { ascending: false })
      .limit(20),
    supabase
      .from("thank_you_letters")
      .select("missionary_id, title, message, letter_date")
      .order("letter_date", { ascending: false, nullsFirst: false })
      .limit(15),

    supabase
      .from("announcements")
      .select("title, body, publish_at, expires_at, published")
      .eq("published", true)
      .order("publish_at", { ascending: false })
      .limit(10),
  ]);

  if (prayers.data) {
    ctx.openPrayerRequests = prayers.data.map((p) => ({
      title: p.title,
      detail: p.detail,
      urgent: p.urgent,
      missionaryId: p.missionary_id,
      missionaryName: nameById.get(p.missionary_id),
      created_at: p.created_at,
    }));
    ctx.sources.push("prayer_requests (live)");
  }
  if (updates.data) {
    ctx.recentUpdates = updates.data.map((u) => ({
      title: u.title,
      summary: u.summary,
      report_date: u.report_date,
      missionaryId: u.missionary_id,
      missionaryName: nameById.get(u.missionary_id),
    }));
    ctx.sources.push("ministry_updates (live)");
  }
  if (letters.data) {
    ctx.recentLetters = letters.data.map((l) => ({
      title: l.title,
      excerpt: l.message ? l.message.slice(0, 240) : null,
      letter_date: l.letter_date,
      missionaryId: l.missionary_id,
      missionaryName: nameById.get(l.missionary_id),
    }));

    ctx.sources.push("thank_you_letters (live)");
  }
  if (anns.data) {
    ctx.announcements = anns.data.map((a) => ({
      title: a.title,
      body: a.body,
      publish_at: a.publish_at,
      expires_at: a.expires_at,
    }));
    ctx.sources.push("announcements (live)");
  }

  ctx.counts.openPrayerRequests = ctx.openPrayerRequests.length;
  ctx.counts.recentUpdates = ctx.recentUpdates.length;
  ctx.counts.recentLetters = ctx.recentLetters.length;
  ctx.counts.announcements = ctx.announcements.length;
  ctx.generatedAt = new Date().toISOString();
  return ctx;
}


function Assistant() {
  useDataStore(); // subscribe so context reflects live data
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your Cross-Cultural Mission assistant. I know the current directory, prayer requests, reports, and upcoming events. Ask me anything.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const ask = useServerFn(askAssistant);
  const { regions, provinces, phases } = useDirectory();
  const { filters, setFilters: setSharedFilters } = useSharedFilters();
  const setFilters = (updater: Filters | ((prev: Filters) => Filters)) => {
    const next = typeof updater === "function" ? (updater as (p: Filters) => Filters)(filters) : updater;
    setSharedFilters(next);
  };
  const regionName = regions.find((r) => r.id === filters.regionId)?.name;
  const provinceName = provinces.find((p) => p.id === filters.provinceId)?.name;
  const filteredProvinces = useMemo(
    () => (filters.regionId === ALL ? provinces : provinces.filter((p) => p.region_id === filters.regionId)),
    [provinces, filters.regionId],
  );
  const [rawContext, setRawContext] = useState<LiveContext>(() => baseContext());
  const context = useMemo(
    () => applyFilters(rawContext, filters, regionName, provinceName),
    [rawContext, filters, regionName, provinceName],
  );

  useEffect(() => {
    let cancelled = false;
    void fetchLive().then((c) => {
      if (!cancelled) setRawContext(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    const nextHistory: Message[] = [...messages, { role: "user", content: q }];
    setMessages(nextHistory);
    setBusy(true);
    try {
      const fresh = await fetchLive();
      setRawContext(fresh);
      const scoped = applyFilters(fresh, filters, regionName, provinceName);
      const { reply } = await ask({
        data: {
          question: q,
          history: nextHistory.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
          context: scoped,
        },
      });
      setMessages((m) => [...m, { role: "assistant", content: reply || "(no reply)" }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI request failed";
      toast.error(msg);
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl gradient-mission text-white shadow-soft">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">AI Mission Assistant</h1>
        <p className="mt-1 text-muted-foreground">
          Grounded in this platform's live data — {context.counts.missionaries} missionaries across{" "}
          {context.counts.areas} areas.
        </p>
        {context.sources.length > 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium">Sources:</span> {context.sources.join(" · ")} · updated {new Date(context.generatedAt).toLocaleTimeString()}
          </p>
        ) : null}
      </header>

      <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Answer scope
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Select value={filters.regionId} onValueChange={(v) => setFilters((f) => ({ ...f, regionId: v, provinceId: ALL }))}>
            <SelectTrigger><SelectValue placeholder="All regions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All regions</SelectItem>
              {regions.map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filters.provinceId} onValueChange={(v) => setFilters((f) => ({ ...f, provinceId: v }))}>
            <SelectTrigger><SelectValue placeholder="All provinces" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All provinces</SelectItem>
              {filteredProvinces.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filters.phaseId} onValueChange={(v) => setFilters((f) => ({ ...f, phaseId: v }))}>
            <SelectTrigger><SelectValue placeholder="All phases" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All phases</SelectItem>
              {phases.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>


      <div className="space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-soft ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}
        {busy ? (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-card px-4 py-3 text-sm shadow-soft">
              <Loader2 className="inline h-4 w-4 animate-spin" /> Thinking…
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <Button
            key={p}
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => send(p)}
            disabled={busy}
          >
            {p}
          </Button>
        ))}
      </div>

      <form
        className="sticky bottom-20 flex gap-2 rounded-full border border-border bg-card p-2 shadow-lift lg:bottom-4"
        onSubmit={(e) => { e.preventDefault(); send(input); }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about missionaries, reports, prayer, upcoming events…"
          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
          disabled={busy}
        />
        <Button type="submit" size="icon" className="rounded-full" aria-label="Send" disabled={busy}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
