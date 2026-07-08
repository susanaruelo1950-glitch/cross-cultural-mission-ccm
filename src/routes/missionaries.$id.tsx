import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Cake,
  Calendar,
  ChevronLeft,
  Church,
  Contact,
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
  getMissionary,
  prayerByMissionary,
  reportsByMissionary,
  type Missionary,
} from "@/lib/mission-data";

export const Route = createFileRoute("/missionaries/$id")({
  loader: ({ params }): { m: NonNullable<ReturnType<typeof getMissionary>> } => {
    const m = getMissionary(params.id);
    if (!m) throw notFound();
    return { m };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Missionary — Great Commission" }] };
    return {
      meta: [
        { title: `${loaderData.m.fullName} — Missionary Profile` },
        { name: "description", content: loaderData.m.missionStatement },
        { property: "og:title", content: `${loaderData.m.fullName} — ${loaderData.m.missionField}` },
        { property: "og:description", content: loaderData.m.missionStatement },
        { property: "og:image", content: loaderData.m.cover },
        { name: "twitter:image", content: loaderData.m.cover },
      ],
    };
  },
  component: Profile,
});

function Profile() {
  const { m } = Route.useLoaderData() as { m: Missionary };
  const myReports = reportsByMissionary(m.id);
  const myPrayers = prayerByMissionary(m.id);
  const supportPct = Math.round((m.supportReceived / m.monthlySupportNeeded) * 100);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/missionaries"><ChevronLeft className="h-4 w-4" /> Back to directory</Link>
      </Button>

      {/* Cover + identity */}
      <div className="card-soft overflow-hidden">
        <div className="h-48 w-full bg-cover bg-center sm:h-64" style={{ backgroundImage: `url(${m.cover})` }} />
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 px-5 pb-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-8">
          <Avatar className="-mt-14 h-28 w-28 border-4 border-card shadow-lift sm:-mt-16 sm:h-32 sm:w-32">
            <AvatarImage src={m.photo} alt={m.fullName} />
            <AvatarFallback>{m.fullName.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 self-end">
            <h1 className="truncate font-display text-2xl font-semibold sm:text-3xl">{m.fullName}</h1>
            <p className="mt-0.5 text-muted-foreground">{m.currentAssignment} · {m.churchName}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-primary text-primary-foreground hover:bg-primary">{m.phase}</Badge>
              <Badge variant="secondary" className="rounded-full">{m.status}</Badge>
              <Badge variant="outline" className="rounded-full">{m.ministryFocus}</Badge>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {m.municipality}, {m.province}
              </span>
            </div>
          </div>
          <div className="col-span-2 flex gap-2 sm:col-span-1 sm:self-end">
            <Button className="rounded-full"><Heart className="h-4 w-4" /> Pray</Button>
            <Button variant="outline" className="rounded-full"><HeartHandshake className="h-4 w-4" /> Support</Button>
          </div>
        </div>
      </div>

      {/* Impact stats */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Churches Planted", value: m.churchesPlanted },
          { label: "Baptisms", value: m.baptisms },
          { label: "Bible Studies", value: m.bibleStudies },
          { label: "Leaders Trained", value: m.leadersTrained },
        ].map((s) => (
          <Card key={s.label} className="card-soft p-5 text-center">
            <div className="font-display text-3xl font-semibold text-primary">{s.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </section>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto rounded-full bg-muted p-1">
          <TabsTrigger value="overview" className="rounded-full">Overview</TabsTrigger>
          <TabsTrigger value="reports" className="rounded-full">Reports</TabsTrigger>
          <TabsTrigger value="prayer" className="rounded-full">Prayer</TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-full">Timeline</TabsTrigger>
          <TabsTrigger value="gallery" className="rounded-full">Gallery</TabsTrigger>
          <TabsTrigger value="support" className="rounded-full">Support</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="card-soft p-6 lg:col-span-2">
            <h2 className="font-display text-xl font-semibold">Mission Statement</h2>
            <p className="mt-2 text-foreground/90">{m.missionStatement}</p>
            <div className="mt-4 rounded-2xl bg-accent p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Life Verse</div>
              <div className="mt-1 font-display text-lg text-accent-foreground">{m.lifeVerse}</div>
            </div>
            <h3 className="mt-6 font-display text-lg font-semibold">Vision</h3>
            <p className="mt-1 text-foreground/90">{m.vision}</p>
            <h3 className="mt-6 font-display text-lg font-semibold">Biography</h3>
            <p className="mt-1 text-foreground/90">{m.bio}</p>
          </Card>

          <Card className="card-soft p-6">
            <h2 className="font-display text-lg font-semibold">Contact & Family</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <ContactRow icon={Phone} label={m.phone} />
              <ContactRow icon={Mail} label={m.email} />
              <ContactRow icon={Cake} label={`Birthday ${m.birthday}`} />
              {m.anniversary ? <ContactRow icon={Heart} label={`Anniversary ${m.anniversary}`} /> : null}
              {m.spouse ? <ContactRow icon={Users} label={`Spouse: ${m.spouse}`} /> : null}
              {m.children.length ? <ContactRow icon={Users} label={`Children: ${m.children.join(", ")}`} /> : null}
              <ContactRow icon={Church} label={`Sent by ${m.sendingChurch}`} />
              <ContactRow icon={Contact} label={`Sending pastor: ${m.sendingPastor}`} />
              <ContactRow icon={Globe2} label={`Agency: ${m.missionAgency}`} />
              <ContactRow icon={Calendar} label={`Commissioned ${m.dateSent}`} />
              <ContactRow icon={MapPin} label={m.address} />
            </ul>
          </Card>

          <Card className="card-soft p-6 lg:col-span-2">
            <h2 className="font-display text-lg font-semibold">People & Field</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail label="Mission Field" value={m.missionField} />
              <Detail label="People Group" value={m.peopleGroup} />
              <Detail label="Ethnic Group" value={m.ethnicGroup} />
              <Detail label="Religious Background" value={m.religiousBackground} />
              <Detail label="Population Reached" value={m.populationReached.toLocaleString()} />
              <Detail label="Languages" value={m.languages.join(", ")} />
              <Detail label="Skills" value={m.skills.join(", ")} />
              <Detail label="Bible School" value={m.bibleSchool} />
            </div>
          </Card>

          <Card className="card-soft p-6">
            <h2 className="font-display text-lg font-semibold">Support Needs</h2>
            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-2xl font-semibold text-primary">₱{m.supportReceived.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">of ₱{m.monthlySupportNeeded.toLocaleString()}/mo</span>
              </div>
              <Progress value={supportPct} className="mt-2 h-2" />
              <p className="mt-1 text-xs text-muted-foreground">{supportPct}% supported</p>
            </div>
            <h3 className="mt-6 text-sm font-semibold">Current Needs</h3>
            <ul className="mt-2 space-y-1 text-sm text-foreground/90">
              {m.needs.map((n) => (
                <li key={n} className="flex gap-2"><span className="text-secondary">•</span>{n}</li>
              ))}
            </ul>
          </Card>
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
                <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-5">
                  <Metric label="Salvations" value={r.salvations} />
                  <Metric label="Baptisms" value={r.baptisms} />
                  <Metric label="Bible Studies" value={r.bibleStudies} />
                  <Metric label="Attendance" value={r.attendance} />
                  <Metric label="Leaders Trained" value={r.leadersTrained} />
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="prayer" className="mt-6 grid gap-4 md:grid-cols-2">
          {myPrayers.map((p) => (
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

        <TabsContent value="timeline" className="mt-6">
          <Card className="card-soft p-6">
            <ol className="relative ml-3 border-l-2 border-primary/20 pl-6">
              {m.timeline.map((t) => (
                <li key={t.date} className="mb-6 last:mb-0">
                  <div className="absolute -left-[9px] mt-1.5 h-4 w-4 rounded-full border-4 border-background bg-primary" />
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.date}</div>
                  <div className="font-display text-lg font-semibold">{t.title}</div>
                  <p className="text-sm text-foreground/90">{t.description}</p>
                </li>
              ))}
            </ol>
          </Card>
        </TabsContent>

        <TabsContent value="gallery" className="mt-6">
          {m.gallery.length === 0 ? (
            <Card className="card-soft p-8 text-center text-muted-foreground">No photos uploaded yet.</Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {m.gallery.map((g, i) => (
                <figure key={i} className="card-soft overflow-hidden p-0">
                  <img src={g.url} alt={g.caption} loading="lazy" className="h-56 w-full object-cover" />
                  <figcaption className="flex items-center justify-between p-3 text-sm">
                    <span>{g.caption}</span>
                    <Badge variant="outline" className="rounded-full">{g.album}</Badge>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="support" className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="card-soft p-6">
            <h3 className="font-display text-lg font-semibold">Monthly Support</h3>
            <div className="mt-2 font-display text-3xl font-semibold text-primary">
              ₱{m.supportReceived.toLocaleString()} <span className="text-base font-normal text-muted-foreground">/ ₱{m.monthlySupportNeeded.toLocaleString()}</span>
            </div>
            <Progress value={supportPct} className="mt-3 h-2" />
          </Card>
          <Card className="card-soft p-6">
            <h3 className="font-display text-lg font-semibold">Current Needs</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {m.needs.map((n) => (<li key={n} className="flex gap-2"><span className="text-secondary">•</span>{n}</li>))}
            </ul>
          </Card>
        </TabsContent>
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
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <div className="font-display text-xl font-semibold text-primary">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
