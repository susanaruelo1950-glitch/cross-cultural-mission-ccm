import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { allMissionaries, getMissionary } from "@/lib/mission-data";
import { summarizeReport } from "@/lib/ai.functions";

export const Route = createFileRoute("/summaries")({
  head: () => ({
    meta: [
      { title: "AI Summaries — Great Commission" },
      {
        name: "description",
        content:
          "Turn monthly ministry reports into short, shareable updates for newsletters, slides, or prayer bulletins.",
      },
    ],
  }),
  component: Summaries,
});

function Summaries() {
  const list = allMissionaries();
  const [missionaryId, setMissionaryId] = useState<string>(list[0]?.id ?? "");
  const [audience, setAudience] = useState<"newsletter" | "presentation" | "prayer-list">(
    "newsletter",
  );
  const [reportText, setReportText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    const m = getMissionary(missionaryId);
    if (!m) return toast.error("Pick a missionary first.");
    if (reportText.trim().length < 20)
      return toast.error("Paste the monthly report first (at least a couple sentences).");
    setLoading(true);
    setSummary("");
    try {
      const { summary } = await summarizeReport({
        data: {
          missionaryName: m.fullName,
          church: m.church,
          reportText,
          audience,
        },
      });
      setSummary(summary);
      toast.success("Summary ready.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(summary);
    toast.success("Copied to clipboard.");
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">AI Summaries</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Paste a monthly ministry report — get a short update ready for your church newsletter,
          slide, or prayer bulletin.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-soft space-y-4 p-6">
          <div className="grid gap-2">
            <Label htmlFor="miss">Missionary</Label>
            <Select value={missionaryId} onValueChange={setMissionaryId}>
              <SelectTrigger id="miss">
                <SelectValue placeholder="Select missionary" />
              </SelectTrigger>
              <SelectContent>
                {list.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="aud">Format</Label>
            <Select
              value={audience}
              onValueChange={(v) =>
                setAudience(v as "newsletter" | "presentation" | "prayer-list")
              }
            >
              <SelectTrigger id="aud">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newsletter">Church newsletter (3 paragraphs)</SelectItem>
                <SelectItem value="presentation">Presentation slide (bullets)</SelectItem>
                <SelectItem value="prayer-list">Prayer bulletin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rep">Monthly report</Label>
            <Textarea
              id="rep"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Paste the full monthly ministry report here — attendance, baptisms, testimonies, challenges, prayer requests…"
              className="min-h-[220px]"
            />
            <Input
              type="file"
              accept=".txt,.md"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setReportText(await f.text());
              }}
              className="text-xs"
              aria-label="Upload a .txt report"
            />
          </div>

          <Button onClick={generate} disabled={loading} className="w-full rounded-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate summary
              </>
            )}
          </Button>
        </Card>

        <Card className="card-soft p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Shareable update</h2>
            {summary ? (
              <Button variant="outline" size="sm" onClick={copy} className="rounded-full">
                <Copy className="h-4 w-4" /> Copy
              </Button>
            ) : null}
          </div>
          {summary ? (
            <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
              {summary}
            </pre>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Your AI-generated update will appear here.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
