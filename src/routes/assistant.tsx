import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  allAreas,
  allMissionaries,
  allPhases,
  missionStats,
  prayerRequests,
  reports,
} from "@/lib/mission-data";
import { useDataStore } from "@/hooks/use-data-store";
import { askAssistant } from "@/lib/ask.functions";

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
  "Summarize the recent ministry reports.",
  "List open prayer requests and who they're for.",
  "When is the next upcoming event?",
];

function buildContext() {
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
      openPrayerRequests: missionStats.totalPrayerRequests,
      reports: missionStats.totalReports,
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
    openPrayerRequests: prayerRequests
      .filter((p) => !p.answered)
      .slice(0, 20)
      .map((p) => ({
        title: p.title,
        detail: p.detail,
        urgent: p.urgent,
        missionaryId: p.missionaryId,
      })),
    announcements: [
      "Upcoming graduation for Phase 2 — FCL Batch 2 this coming November.",
    ],
  };
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
  const context = useMemo(() => buildContext(), []);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    const nextHistory: Message[] = [...messages, { role: "user", content: q }];
    setMessages(nextHistory);
    setBusy(true);
    try {
      const { reply } = await ask({
        data: {
          question: q,
          history: nextHistory.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
          context: buildContext(),
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
      </header>

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
