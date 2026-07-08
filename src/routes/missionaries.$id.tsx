import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Cake,
  Calendar,
  ChevronLeft,
  Church,
  FileText,
  Globe2,
  Heart,
  HeartHandshake,
  Mail,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getArea,
  getMissionary,
  getPhase,
  prayerByMissionary,
  reportsByMissionary,
  upsertMissionary,
  type JourneyStage,
  type Missionary,
} from "@/lib/mission-data";
import { JourneyTimeline } from "@/components/JourneyTimeline";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/missionaries/$id")({
  loader: ({ params }): { m: Missionary } => {
    const m = getMissionary(params.id);
    if (!m) throw notFound();
    return { m };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Missionary — Great Commission" }] };
    const m = loaderData.m;
    const meta: { name?: string; property?: string; content: string; title?: string }[] = [
      { name: "description", content: m.missionStatement || `${m.fullName} — ${m.church}` },
      { property: "og:title", content: `${m.fullName} — ${m.church}` },
      { property: "og:description", content: m.missionStatement || m.church },
    ];
    if (m.cover) {
      meta.push({ property: "og:image", content: m.cover });
      meta.push({ name: "twitter:image", content: m.cover });
    }
    return { meta: [{ title: `${m.fullName} — Missionary Profile` }, ...meta] };
  },
  component: Profile,
});

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function Profile() {
  const { m: initial } = Route.useLoaderData() as { m: Missionary };
  const [m, setM] = useState<Missionary>(initial);
  const area = getArea(m.areaId);
  const phase = area ? getPhase(area.phaseId) : undefined;
  const myReports = reportsByMissionary(m.id);
  const myPrayers = prayerByMissionary(m.id);
  const needed = m.monthlySupportNeeded ?? 0;
  const received = m.supportReceived ?? 0;
  const supportPct = needed ? Math.round((received / needed) * 100) : 0;
  const children: string[] = m.children ?? [];
  const languages: string[] = m.languages ?? [];
  const needs: string[] = m.needs ?? [];
  const gallery: NonNullable<Missionary["gallery"]> = m.gallery ?? [];
  const timeline: NonNullable<Missionary["timeline"]> = m.timeline ?? [];

  function updateStage(stage: JourneyStage) {
    const updated = { ...m, journeyStage: stage };
    setM(updated);
    upsertMissionary(updated);
    toast.success(`Milestone updated to “${stage}”.`);
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/missionaries"><ChevronLeft className="h-4 w-4" /> Back to directory</Link>
      </Button>

      {/* Cover + identity */}
      <div className="card-soft overflow-hidden">
        <div
          className="h-48 w-full gradient-mission bg-cover bg-center sm:h-60"
          style={m.cover ? { backgroundImage: `url(${m.cover})` } : undefined}
        />
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 px-5 pb-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-8">
          <Avatar className="-mt-14 h-24 w-24 border-4 border-card shadow-lift sm:-mt-16 sm:h-32 sm:w-32">
            <AvatarImage src={m.photo} alt={m.fullName} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl">{initials(m.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 self-end">
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">{m.fullName}</h1>
            {m.church ? (
              <p className="mt-0.5 text-muted-foreground">{m.church}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {phase ? (
                <Badge className="rounded-full bg-primary text-primary-foreground hover:bg-primary">{phase.name}</Badge>
              ) : null}
              {area ? (
                <Badge variant="secondary" className="rounded-full">{area.name}</Badge>
              ) : null}
              {m.ministryFocus ? (
                <Badge variant="outline" className="rounded-full">{m.ministryFocus}</Badge>
              ) : null}
              {m.status ? (
                <Badge variant="outline" className="rounded-full">{m.status}</Badge>
              ) : null}
              {m.address ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {m.address}
                </span>
              ) : null}
            </div>
          </div>
          <div className="col-span-2 flex gap-2 sm:col-span-1 sm:self-end">
            <Button variant="outline" className="rounded-full"><HeartHandshake className="h-4 w-4" /> Support</Button>
          </div>
        </div>
      </div>

      {/* Prayer counter — DB-backed "I prayed for this pastor" */}
      <PrayerCounter missionaryId={m.id} />

      {/* Mission journey timeline — commissioning through multiplication */}
      <Card className="card-soft p-6">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Support Status Timeline</h2>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Mission Journey
          </span>
        </div>
        <JourneyTimeline
          current={m.journeyStage ?? "Church Planting"}
          editable
          onChange={updateStage}
        />
      </Card>

      {/* Ministry updates (DB-backed, admin can add with photo) */}
      <MinistryUpdates missionaryId={m.id} missionaryName={m.fullName} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto rounded-full bg-muted p-1">
          <TabsTrigger value="overview" className="rounded-full">Overview</TabsTrigger>
          <TabsTrigger value="reports" className="rounded-full">Reports</TabsTrigger>
          <TabsTrigger value="prayer" className="rounded-full">Prayer</TabsTrigger>
          {timeline.length ? <TabsTrigger value="timeline" className="rounded-full">Timeline</TabsTrigger> : null}
          {gallery.length ? <TabsTrigger value="gallery" className="rounded-full">Gallery</TabsTrigger> : null}
          {needed ? <TabsTrigger value="support" className="rounded-full">Support</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="overview" className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="card-soft p-6 lg:col-span-2">
            <h2 className="font-display text-xl font-semibold">Mission Statement</h2>
            <p className="mt-2 text-foreground/90 italic">
              {m.missionStatement || <span className="not-italic text-muted-foreground">Not provided yet.</span>}
            </p>
            {m.lifeVerse ? (
              <div className="mt-4 rounded-2xl bg-accent p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Life Verse</div>
                <div className="mt-1 font-display text-lg text-accent-foreground">{m.lifeVerse}</div>
              </div>
            ) : null}
            {m.vision ? (<><h3 className="mt-6 font-display text-lg font-semibold">Vision</h3><p className="mt-1 text-foreground/90">{m.vision}</p></>) : null}
            {m.bio ? (<><h3 className="mt-6 font-display text-lg font-semibold">Biography</h3><p className="mt-1 text-foreground/90">{m.bio}</p></>) : null}
          </Card>

          <Card className="card-soft p-6">
            <h2 className="font-display text-lg font-semibold">Contact & Family</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {m.church ? <ContactRow icon={Church} label={m.church} /> : null}
              {m.address ? <ContactRow icon={MapPin} label={m.address} /> : null}
              {m.phone ? <ContactRow icon={Phone} label={m.phone} /> : null}
              {m.email ? <ContactRow icon={Mail} label={m.email} /> : null}
              {m.birthday ? <ContactRow icon={Cake} label={`Birthday ${m.birthday}`} /> : null}
              {m.anniversary ? <ContactRow icon={Heart} label={`Anniversary ${m.anniversary}`} /> : null}
              {m.spouse ? <ContactRow icon={Users} label={`Spouse: ${m.spouse}`} /> : null}
              {children.length ? <ContactRow icon={Users} label={`Children: ${children.join(", ")}`} /> : null}
              {m.sendingChurch ? <ContactRow icon={Church} label={`Sent by ${m.sendingChurch}`} /> : null}
              {m.missionAgency ? <ContactRow icon={Globe2} label={`Agency: ${m.missionAgency}`} /> : null}
              {m.dateSent ? <ContactRow icon={Calendar} label={`Commissioned ${m.dateSent}`} /> : null}
            </ul>
          </Card>

          {(m.peopleGroup || m.ethnicGroup || languages.length || m.religiousBackground) ? (
            <Card className="card-soft p-6 lg:col-span-3">
              <h2 className="font-display text-lg font-semibold">People & Field</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {m.peopleGroup ? <Detail label="People Group" value={m.peopleGroup} /> : null}
                {m.ethnicGroup ? <Detail label="Ethnic Group" value={m.ethnicGroup} /> : null}
                {m.religiousBackground ? <Detail label="Religious Background" value={m.religiousBackground} /> : null}
                {languages.length ? <Detail label="Languages" value={languages.join(", ")} /> : null}
              </div>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="reports" className="mt-6 space-y-4">
          {myReports.length === 0 ? (
            <Card className="card-soft p-8 text-center text-muted-foreground">
              <FileText className="mx-auto mb-2 h-8 w-8" />
              No reports submitted yet.
            </Card>
          ) : (
            myReports.map((r) => (
              <Card key={r.id} className="card-soft p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold">{r.title}</h3>
                  <span className="text-sm text-muted-foreground">{r.date}</span>
                </div>
                <p className="mt-2 text-foreground/90">{r.summary}</p>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="prayer" className="mt-6 grid gap-4 md:grid-cols-2">
          {myPrayers.length === 0 ? (
            <Card className="card-soft col-span-full p-8 text-center text-muted-foreground">
              No prayer requests yet.
            </Card>
          ) : myPrayers.map((p) => (
            <Card key={p.id} className={`card-soft p-5 ${p.answered ? "bg-accent" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-base font-semibold">{p.title}</h3>
                {p.urgent && !p.answered ? <Badge variant="destructive" className="rounded-full">Urgent</Badge> : null}
                {p.answered ? <Badge className="rounded-full bg-secondary text-secondary-foreground">Answered</Badge> : null}
              </div>
              <p className="mt-2 text-sm text-foreground/90">{p.detail}</p>
              <p className="mt-2 text-xs text-muted-foreground">{p.date}</p>
            </Card>
          ))}
        </TabsContent>

        {timeline.length ? (
          <TabsContent value="timeline" className="mt-6">
            <Card className="card-soft p-6">
              <ol className="relative ml-3 border-l-2 border-primary/20 pl-6">
                {timeline.map((t) => (
                  <li key={t.date} className="relative mb-6 last:mb-0">
                    <div className="absolute -left-[33px] mt-1.5 h-4 w-4 rounded-full border-4 border-background bg-primary" />
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.date}</div>
                    <div className="font-display text-lg font-semibold">{t.title}</div>
                    {t.description ? <p className="text-sm text-foreground/90">{t.description}</p> : null}
                  </li>
                ))}
              </ol>
            </Card>
          </TabsContent>
        ) : null}

        {gallery.length ? (
          <TabsContent value="gallery" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((g, i) => (
                <figure key={i} className="card-soft overflow-hidden p-0">
                  <img src={g.url} alt={g.caption ?? ""} loading="lazy" className="h-56 w-full object-cover" />
                  {g.caption ? (
                    <figcaption className="flex items-center justify-between p-3 text-sm">
                      <span>{g.caption}</span>
                      {g.album ? <Badge variant="outline" className="rounded-full">{g.album}</Badge> : null}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          </TabsContent>
        ) : null}

        {needed ? (
          <TabsContent value="support" className="mt-6 grid gap-4 md:grid-cols-2">
            <Card className="card-soft p-6">
              <h3 className="font-display text-lg font-semibold">Monthly Support</h3>
              <div className="mt-2 font-display text-3xl font-semibold text-primary">
                ₱{received.toLocaleString()} <span className="text-base font-normal text-muted-foreground">/ ₱{needed.toLocaleString()}</span>
              </div>
              <Progress value={supportPct} className="mt-3 h-2" />
            </Card>
            {needs.length ? (
              <Card className="card-soft p-6">
                <h3 className="font-display text-lg font-semibold">Current Needs</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {needs.map((n) => (<li key={n} className="flex gap-2"><span className="text-secondary">•</span>{n}</li>))}
                </ul>
              </Card>
            ) : null}
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}

function ContactRow({ icon: Icon, label }: { icon: typeof Phone; label: string }) {
  return (
    <li className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 break-words">{label}</span>
    </li>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
