import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, Loader2, Lock, LogIn, ShieldAlert } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { askBrilliant } from "@/lib/brilliant.functions";

export const Route = createFileRoute("/brilliant")({
  head: () => ({
    meta: [
      { title: "Brilliant Agent — CCM Admin" },
      { name: "description", content: "Exclusive admin/coordinator agent for Cross-Cultural Ministry — ask anything about the app." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BrilliantPage,
});

interface Message { role: "user" | "assistant"; content: string }

const PROMPTS = [
  "Give me a full health check of the app right now.",
  "Find duplicate or near-duplicate missionary names.",
  "Which missionaries are missing province or municipality?",
  "Show urgent unanswered prayer requests and who added them.",
  "What changed in the last 24 hours? (from the activity log)",
  "Which areas have no missionaries assigned?",
  "Suggest 5 concrete improvements I should make this week.",
];

function BrilliantPage() {
  const { user, isAdmin, isCoordinator, loading } = useAuth();
  const canUse = isAdmin || isCoordinator;
  const ask = useServerFn(askBrilliant);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "**Welcome to the Brilliant Agent.**\n\nI have deep, live access to everything inside this app — missionaries, areas, phases, prayer requests, updates, letters, announcements, partners, coordinator assignments, and the admin activity log.\n\nAsk me about errors, issues, updates, data quality, audit trails, or anything you need to know.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  if (!user) {
    return (
      <Card className="card-soft mx-auto max-w-md p-8 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-primary" aria-hidden />
        <h1 className="font-display text-2xl font-semibold">Sign in required</h1>
        <p className="mt-2 text-sm text-muted-foreground">The Brilliant Agent is exclusive to admins and mission coordinators.</p>
        <Button asChild className="mt-4 rounded-full">
          <Link to="/auth"><LogIn className="h-4 w-4" /> Sign in</Link>
        </Button>
      </Card>
    );
  }

  if (!canUse) {
    return (
      <Card className="card-soft mx-auto max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-destructive" aria-hidden />
        <h1 className="font-display text-2xl font-semibold">Restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only <strong>admins</strong> and assigned <strong>coordinators</strong> can access the Brilliant Agent.
          Ask an admin to grant you a coordinator role.
        </p>
      </Card>
    );
  }

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
        },
      });
      setMessages((m) => [...m, { role: "assistant", content: reply || "(no reply)" }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Brilliant Agent request failed";
      toast.error(msg);
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-soft">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Brilliant Agent</h1>
        <p className="mt-1 text-muted-foreground">
          Admin & coordinator exclusive · knows everything about this app in real time.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Signed in as <strong>{user.email}</strong> · {isAdmin ? "Admin" : "Coordinator"}
        </p>
      </header>

      <div className="space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-soft ${
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
              <Loader2 className="inline h-4 w-4 animate-spin" /> Analyzing app data…
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <Button key={p} size="sm" variant="outline" className="rounded-full" onClick={() => send(p)} disabled={busy}>
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
          placeholder="Ask about errors, issues, updates, or anything in the app…"
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
