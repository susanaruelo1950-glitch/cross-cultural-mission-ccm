import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, FileType2, Presentation, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/documents")({
  head: () => ({ meta: [{ title: "Document Library — Cross-Cultural Mission" }] }),
  component: DocsPage,
});

const docs = [
  { name: "2025 Mission Handbook", type: "PDF", size: "3.2 MB", updated: "2025-09-01", icon: FileText },
  { name: "Church Planting Training Manual", type: "PDF", size: "5.8 MB", updated: "2025-06-14", icon: FileText },
  { name: "Q3 Regional Newsletter", type: "PDF", size: "1.4 MB", updated: "2025-10-05", icon: FileText },
  { name: "Annual Financial Report 2024", type: "PDF", size: "2.1 MB", updated: "2025-03-30", icon: FileText },
  { name: "Missionary Care Policy", type: "DOCX", size: "220 KB", updated: "2025-02-11", icon: FileType2 },
  { name: "Board Presentation — October", type: "PPTX", size: "12.4 MB", updated: "2025-10-20", icon: Presentation },
  { name: "Ifugao Testimony Video", type: "MP4", size: "84 MB", updated: "2025-08-22", icon: Video },
];

function DocsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Document Library</h1>
        <p className="mt-1 text-muted-foreground">Training materials, newsletters, and mission policies.</p>
      </header>
      <Card className="card-soft divide-y divide-border p-0">
        {docs.map((d) => (
          <div key={d.name} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <d.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium">{d.name}</div>
              <div className="text-xs text-muted-foreground">{d.type} · {d.size} · Updated {d.updated}</div>
            </div>
            <Button variant="outline" size="sm" className="rounded-full"><Download className="h-4 w-4" /> Download</Button>
          </div>
        ))}
      </Card>
    </div>
  );
}
