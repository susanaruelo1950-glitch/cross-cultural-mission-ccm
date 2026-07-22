import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Download, FileText, Trash2, Upload, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { safeStoragePath, validateFile } from "@/lib/upload-validation";

interface DocRow {
  id: string;
  name: string;
  description: string | null;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Document Library — Cross-Cultural Ministry" },
      { name: "description", content: "Training materials, newsletters, and mission policies for Cross-Cultural Ministry." },
      { property: "og:title", content: "Document Library — Cross-Cultural Ministry" },
      { property: "og:description", content: "Training materials, newsletters, and mission policies for Cross-Cultural Ministry." },
      { property: "og:url", content: "https://cross-cultural-mission-ccm.lovable.app/documents" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp" },
      { name: "twitter:title", content: "Document Library — Cross-Cultural Ministry" },
      { name: "twitter:description", content: "Training materials, newsletters, and mission policies for Cross-Cultural Ministry." },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp" },
    ],
    links: [{ rel: "canonical", href: "https://cross-cultural-mission-ccm.lovable.app/documents" }],
  }),
  component: DocsPage,
});

const MAX_MB = 50;

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DocsPage() {
  const { user, isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState("");

  const { data: docs = [], isLoading } = useQuery<DocRow[]>({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, name, description, storage_path, mime_type, size_bytes, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocRow[];
    },
    enabled: !!user,
  });

  // Realtime: any admin add/delete refreshes for everyone signed in
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("documents_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () => {
        qc.invalidateQueries({ queryKey: ["documents"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user, qc]);

  async function handleUpload(file: File) {
    const v = validateFile(file, {
      allowed: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "text/plain",
      ],
      maxMb: MAX_MB,
    });
    if (!v.ok) { toast.error(v.reason ?? "Invalid file"); return; }

    setUploading(true);
    try {
      const path = safeStoragePath("library", file);
      const up = await supabase.storage.from("documents").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (up.error) throw up.error;
      const { error: insErr } = await supabase.from("documents").insert({
        name: file.name,
        description: description.trim() || null,
        storage_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
        uploaded_by: user?.id ?? null,
      });
      if (insErr) {
        // Roll back the uploaded object if the DB insert failed
        await supabase.storage.from("documents").remove([path]);
        throw insErr;
      }
      setDescription("");
      if (fileInput.current) fileInput.current.value = "";
      toast.success(`Uploaded ${file.name}`);
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc: DocRow) {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.storage_path, 60, { download: doc.name });
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }

  async function handleDelete(doc: DocRow) {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    try {
      const { error: sErr } = await supabase.storage.from("documents").remove([doc.storage_path]);
      if (sErr) console.warn("[documents] storage remove:", sErr.message);
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  if (!user) {
    return (
      <Card className="card-soft mx-auto max-w-md p-8 text-center">
        <Lock className="mx-auto mb-3 h-8 w-8 text-primary" />
        <h1 className="font-display text-2xl font-semibold">Sign in required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The document library is available to signed-in supporters, coordinators, and admins.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Document Library</h1>
        <p className="mt-1 text-muted-foreground">
          Training materials, newsletters, and mission policies.
          {!isAdmin ? " Contact an admin to add new files." : null}
        </p>
      </header>

      {isAdmin ? (
        <Card className="card-soft p-5">
          <h2 className="font-display text-lg font-semibold">Upload a document</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            PDF, Office, images, or MP4. Max {MAX_MB} MB per file.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              disabled={uploading}
            />
            <div className="flex gap-2">
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUpload(f);
                }}
              />
              <Button
                onClick={() => fileInput.current?.click()}
                className="rounded-full"
                disabled={uploading}
              >
                <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Choose file"}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="card-soft divide-y divide-border p-0">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading documents…</div>
        ) : docs.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No documents yet.{isAdmin ? " Upload the first one above." : ""}
          </div>
        ) : (
          docs.map((d) => (
            <div key={d.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium">{d.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(d.mime_type?.split("/").pop() ?? "file").toUpperCase()}
                  {d.size_bytes ? ` · ${formatSize(d.size_bytes)}` : ""}
                  {" · Uploaded "}{new Date(d.created_at).toLocaleDateString()}
                </div>
                {d.description ? (
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{d.description}</div>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleDownload(d)}
                >
                  <Download className="h-4 w-4" /> Download
                </Button>
                {isAdmin ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-destructive"
                    aria-label={`Delete ${d.name}`}
                    onClick={() => handleDelete(d)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
