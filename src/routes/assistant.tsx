import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send, Sparkles, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { missionaries, prayerRequests, reports } from "@/lib/mission-data";

export const Route = createFileRoute("/assistant")({
  head: () => ({ meta: [{ title: "AI Mission Assistant — Great Commission" }] }),
  component: Assistant,
});

interface Message {
  role: "user" | "assistant";
  text: string;
  citations?: string[];
}

const prompts = [
  "How many missionaries do we have?",
  "Show urgent prayer requests",
  "Summarize recent reports",
  "List missionaries by phase",
];

function Assistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hello! I'm your Mission Assistant. I only answer using information already in the platform, and I always cite my sources. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");

  const answer = (q: string): Message => {
    const lower = q.toLowerCase();
    if (lower.includes("urgent") || lower.includes("prayer")) {
      const urgent = prayerRequests.filter((p) => p.urgent && !p.answered);
      if (urgent.length === 0) return { role: "assistant", text: "No urgent prayer requests right now." };
      return {
        role: "assistant",
        text: `There are ${urgent.length} urgent prayer requests:\n\n${urgent
          .map((p) => {
            const m = missionaries.find((x) => x.id === p.missionaryId);
            return `• ${m?.fullName ?? "Unknown"} — ${p.title}: ${p.detail}`;
          })
          .join("\n")}`,
        citations: urgent.map((p) => `Prayer #${p.id}`),
      };
    }
    if (lower.includes("summar") || lower.includes("report")) {
      if (reports.length === 0) return { role: "assistant", text: "No reports have been submitted yet." };
      const totals = reports.reduce(
        (acc, r) => ({
          salvations: acc.salvations + (r.salvations ?? 0),
          baptisms: acc.baptisms + (r.baptisms ?? 0),
          attendance: acc.attendance + (r.attendance ?? 0),
          bibleStudies: acc.bibleStudies + (r.bibleStudies ?? 0),
        }),
        { salvations: 0, baptisms: 0, attendance: 0, bibleStudies: 0 },
      );
      return {
        role: "assistant",
        text: `Across ${reports.length} report(s):\n\n• Salvations: ${totals.salvations}\n• Baptisms: ${totals.baptisms}\n• Attendance: ${totals.attendance}\n• Bible studies: ${totals.bibleStudies}`,
        citations: reports.map((r) => r.title),
      };
    }
    if (lower.includes("how many") || lower.includes("missionaries")) {
      return {
        role: "assistant",
        text: `There are ${missionaries.length} missionaries currently in the directory.`,
        citations: ["Missionary directory"],
      };
    }
    return {
      role: "assistant",
      text: "I can help you summarize reports, surface prayer needs, and answer questions about your missionaries. Try one of the suggested prompts, or ask about a specific person or area. I only answer from data in this platform.",
    };
  };

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", text };
    const aiMsg = answer(text);
    setMessages((m) => [...m, userMsg, aiMsg]);
    setInput("");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl gradient-mission text-white shadow-soft">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">AI Mission Assistant</h1>
        <p className="mt-1 text-muted-foreground">Grounded only in this platform. Every answer cites its source.</p>
      </header>

      <Card className="card-soft p-4">
        <div className="flex items-start gap-2 rounded-xl bg-accent p-3 text-sm text-accent-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Prototype demo — answers are generated locally. Connect Lovable AI Gateway to enable full LLM responses.</p>
        </div>
      </Card>

      <div className="space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-soft ${
              m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"
            }`}>
              <p className="whitespace-pre-wrap">{m.text}</p>
              {m.citations?.length ? (
                <div className="mt-2 border-t border-border/40 pt-2 text-xs opacity-80">
                  <div className="font-semibold">Sources</div>
                  <ul className="mt-1 space-y-0.5">
                    {m.citations.map((c) => (<li key={c}>· {c}</li>))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {prompts.map((p) => (
          <Button key={p} size="sm" variant="outline" className="rounded-full" onClick={() => send(p)}>
            {p}
          </Button>
        ))}
      </div>

      <form
        className="sticky bottom-20 flex gap-2 rounded-full border border-border bg-card p-2 shadow-lift lg:bottom-4"
        onSubmit={(e) => { e.preventDefault(); send(input); }}
      >
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about missionaries, reports, prayer..." className="border-0 bg-transparent shadow-none focus-visible:ring-0" />
        <Button type="submit" size="icon" className="rounded-full" aria-label="Send"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
