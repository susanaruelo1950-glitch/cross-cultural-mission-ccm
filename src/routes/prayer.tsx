import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, HeartHandshake, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { missionaries, prayerRequests } from "@/lib/mission-data";

export const Route = createFileRoute("/prayer")({
  head: () => ({
    meta: [
      { title: "Prayer Center — Great Commission" },
      { name: "description", content: "Daily and urgent prayer requests from missionaries across the Philippines." },
    ],
  }),
  component: PrayerCenter,
});

function PrayerCenter() {
  const [prayed, setPrayed] = useState<Set<string>>(new Set());
  const urgent = prayerRequests.filter((p) => p.urgent && !p.answered);
  const active = prayerRequests.filter((p) => !p.answered);
  const answered = prayerRequests.filter((p) => p.answered);

  const togglePrayed = (id: string) => {
    setPrayed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderList = (list: typeof prayerRequests) => (
    <div className="grid gap-4 md:grid-cols-2">
      {list.map((p) => {
        const m = missionaries.find((x) => x.id === p.missionaryId)!;
        const isPrayed = prayed.has(p.id);
        return (
          <Card key={p.id} className={`card-soft p-5 ${p.answered ? "bg-accent" : ""}`}>
            <div className="flex items-start gap-3">
              <Avatar className="h-11 w-11">
                <AvatarImage src={m.photo} alt={m.fullName} />
                <AvatarFallback>{m.fullName.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="truncate font-display text-base font-semibold">{p.title}</h3>
                  {p.urgent && !p.answered ? <Badge variant="destructive" className="rounded-full">Urgent</Badge> : null}
                  {p.answered ? <Badge className="rounded-full bg-secondary text-secondary-foreground">Answered</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-foreground/90">{p.detail}</p>
                <Link to="/missionaries/$id" params={{ id: m.id }} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                  {m.fullName} · {m.missionField}
                </Link>
              </div>
            </div>
            {!p.answered ? (
              <Button
                onClick={() => togglePrayed(p.id)}
                variant={isPrayed ? "secondary" : "outline"}
                className="mt-4 w-full rounded-full"
              >
                <Heart className={`h-4 w-4 ${isPrayed ? "fill-current" : ""}`} />
                {isPrayed ? "Prayed" : "Mark as Prayed"}
              </Button>
            ) : null}
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Prayer Center</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            "Pray earnestly to the Lord of the harvest to send out laborers into his harvest." — Matthew 9:38
          </p>
        </div>
        <Button className="rounded-full"><HeartHandshake className="h-4 w-4" /> Prayer Calendar</Button>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="card-soft p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Urgent</div>
          <div className="mt-1 font-display text-2xl font-semibold text-destructive">{urgent.length}</div>
        </Card>
        <Card className="card-soft p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Active</div>
          <div className="mt-1 font-display text-2xl font-semibold text-primary">{active.length}</div>
        </Card>
        <Card className="card-soft p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Answered</div>
          <div className="mt-1 font-display text-2xl font-semibold text-secondary">{answered.length}</div>
        </Card>
        <Card className="card-soft p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Prayed Today</div>
          <div className="mt-1 font-display text-2xl font-semibold text-warm-foreground">{prayed.size}</div>
        </Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="rounded-full bg-muted p-1">
          <TabsTrigger value="urgent" className="rounded-full">Urgent</TabsTrigger>
          <TabsTrigger value="active" className="rounded-full">Active</TabsTrigger>
          <TabsTrigger value="answered" className="rounded-full">Answered</TabsTrigger>
        </TabsList>
        <TabsContent value="urgent" className="mt-6">{renderList(urgent)}</TabsContent>
        <TabsContent value="active" className="mt-6">{renderList(active)}</TabsContent>
        <TabsContent value="answered" className="mt-6">
          <div className="mb-4 flex items-center gap-2 text-sm text-secondary">
            <Sparkles className="h-4 w-4" /> Praise God for these answered prayers!
          </div>
          {renderList(answered)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
