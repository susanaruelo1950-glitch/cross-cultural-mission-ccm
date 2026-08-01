import { useMemo, useState } from "react";
import { FileText, FileType2, Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type FieldCatalog = { title: string; labels: string[] }[];

export const PHOTO_KEY = "__photo__";

/** Stable key for a single field. */
export function fieldKey(section: string, label: string) {
  return `${section}::${label}`;
}

type Preset = { name: string; description: string; keys: (catalog: FieldCatalog) => string[] };

function pick(catalog: FieldCatalog, wanted: Record<string, string[]>) {
  const out: string[] = [];
  for (const s of catalog) {
    const labels = wanted[s.title];
    if (!labels) continue;
    for (const l of s.labels) if (labels.includes(l)) out.push(fieldKey(s.title, l));
  }
  return out;
}

const PRESETS: Preset[] = [
  {
    name: "Everything",
    description: "Full record for every missionary, including photos",
    keys: (c) => [PHOTO_KEY, ...c.flatMap((s) => s.labels.map((l) => fieldKey(s.title, l)))],
  },
  {
    name: "Contact sheet",
    description: "Name, photo, church, location and contact details",
    keys: (c) => [
      PHOTO_KEY,
      ...pick(c, {
        "Identity & Calling": ["Full name", "Church", "Status"],
        "Assignment & Location": ["Phase", "Area", "Municipality", "Province", "Region"],
        Contact: ["Phone", "Email", "Facebook"],
      }),
    ],
  },
  {
    name: "Prayer support",
    description: "Name, family, people reached and prayer requests",
    keys: (c) => [
      PHOTO_KEY,
      ...pick(c, {
        "Identity & Calling": ["Full name", "Mission statement", "Ministry focus"],
        "Assignment & Location": ["Area", "Province"],
        Family: ["Spouse", "Children"],
        "People Reached": ["People group", "Languages"],
        "Prayer & Needs": ["Prayer requests", "Needs"],
      }),
    ],
  },
  {
    name: "Location roster",
    description: "Where each missionary serves, with batch and area",
    keys: (c) =>
      pick(c, {
        "Identity & Calling": ["Full name", "Church", "Status"],
        "Assignment & Location": [
          "Phase",
          "Area",
          "Barangay",
          "Municipality",
          "Province",
          "Region",
          "Country",
        ],
      }),
  },
  {
    name: "Support & sending",
    description: "Sending church, agency, years in ministry and support figures",
    keys: (c) =>
      pick(c, {
        "Identity & Calling": ["Full name", "Church"],
        "Sending & Support": [
          "Sending church",
          "Sending pastor",
          "Mission agency",
          "Date sent",
          "Years in ministry",
          "Monthly support needed",
          "Support received",
          "Needs",
        ],
      }),
  },
];

type Props = {
  catalog: FieldCatalog;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  onExport: (kind: "pdf" | "docx") => void | Promise<void>;
  busy: "pdf" | "docx" | null;
  recordCount: number;
};

export function DirectoryExportDialog({
  catalog,
  selected,
  onChange,
  onExport,
  busy,
  recordCount,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const total = useMemo(
    () => catalog.reduce((n, s) => n + s.labels.length, 0) + 1,
    [catalog],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return catalog;
    return catalog
      .map((s) => ({
        title: s.title,
        labels: s.labels.filter(
          (l) => l.toLowerCase().includes(needle) || s.title.toLowerCase().includes(needle),
        ),
      }))
      .filter((s) => s.labels.length > 0);
  }, [catalog, q]);

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  function toggleSection(section: string, labels: string[], on: boolean) {
    const next = new Set(selected);
    for (const l of labels) {
      const k = fieldKey(section, l);
      if (on) next.add(k);
      else next.delete(k);
    }
    onChange(next);
  }

  async function run(kind: "pdf" | "docx") {
    await onExport(kind);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-full">
          <SlidersHorizontal className="h-4 w-4" /> Custom download
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-hidden p-0 sm:w-auto">
        <DialogHeader className="border-b px-4 py-3 sm:px-6">
          <DialogTitle>Choose what to download</DialogTitle>
          <DialogDescription>
            Pick only the missionary information you need, then export {recordCount} record
            {recordCount === 1 ? "" : "s"} as PDF or Word.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-4 pt-3 sm:px-6">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.name}
                size="sm"
                variant="outline"
                className="rounded-full"
                title={p.description}
                onClick={() => onChange(new Set(p.keys(catalog)))}
              >
                {p.name}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full"
              onClick={() => onChange(new Set())}
            >
              Clear all
            </Button>
          </div>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search fields — email, province, spouse, support..."
          />
        </div>

        <ScrollArea className="max-h-[46dvh] px-4 sm:px-6">
          <div className="space-y-5 py-3">
            <label className="flex items-start gap-3 rounded-lg border p-3">
              <Checkbox
                checked={selected.has(PHOTO_KEY)}
                onCheckedChange={() => toggle(PHOTO_KEY)}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">Photo</span>
                <span className="block text-xs text-muted-foreground">
                  Embeds each missionary&apos;s portrait in the document.
                </span>
              </span>
            </label>

            {filtered.map((s) => {
              const all = s.labels.every((l) => selected.has(fieldKey(s.title, l)));
              return (
                <section key={s.title} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {s.title}
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-full text-xs"
                      onClick={() => toggleSection(s.title, s.labels, !all)}
                    >
                      {all ? "Unselect section" : "Select section"}
                    </Button>
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {s.labels.map((l) => {
                      const k = fieldKey(s.title, l);
                      return (
                        <label
                          key={k}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                        >
                          <Checkbox checked={selected.has(k)} onCheckedChange={() => toggle(k)} />
                          <span className="min-w-0 truncate">{l}</span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Badge variant="secondary" className="rounded-full self-start">
            {selected.size} of {total} fields selected
          </Badge>
          <div className="flex gap-2">
            <Button
              className="rounded-full"
              disabled={busy !== null || selected.size === 0}
              onClick={() => run("pdf")}
            >
              {busy === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Download PDF
            </Button>
            <Button
              variant="secondary"
              className="rounded-full"
              disabled={busy !== null || selected.size === 0}
              onClick={() => run("docx")}
            >
              {busy === "docx" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileType2 className="h-4 w-4" />
              )}
              Download Word
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
