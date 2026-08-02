import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Archive,
  CloudUpload,
  Database,
  Download,
  History,
  Loader2,
  RotateCcw,
  Save,
  Timer,
} from "lucide-react";
import {
  DEFAULT_BACKUP_OPTIONS,
  backupFilename,
  buildBackupZip,
  downloadBlob,
  fetchManifest,
  type BackupManifest,
  type BackupOptions,
} from "@/lib/full-backup-zip";
import { restoreBackupZip, type RestoreReport } from "@/lib/full-backup-restore";
import {
  getBackupState,
  runRemoteBackupNow,
  saveBackupSettings,
} from "@/lib/full-backup.functions";

interface BackupSettings {
  id?: string;
  frequency: "off" | "daily" | "weekly" | "monthly";
  target: "github" | "drive" | "both";
  github_owner: string | null;
  github_repo: string | null;
  github_branch: string | null;
  github_folder: string | null;
  include_storage: boolean;
  include_auth_users: boolean;
  last_run_at: string | null;
  last_status: string | null;
}

interface BackupRun {
  id: string;
  kind: string;
  target: string;
  status: string;
  detail: string | null;
  tables_count: number;
  files_count: number;
  bytes: number;
  location_url: string | null;
  actor_email: string | null;
  created_at: string;
}

const EMPTY_SETTINGS: BackupSettings = {
  frequency: "off",
  target: "github",
  github_owner: "",
  github_repo: "",
  github_branch: "",
  github_folder: "backups",
  include_storage: false,
  include_auth_users: true,
  last_run_at: null,
  last_status: null,
};

function mb(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

export default function AdminBackupPanel() {
  const [options, setOptions] = useState<BackupOptions>(() => {
    try {
      const saved = localStorage.getItem("ccm.backup.options");
      if (saved) return { ...DEFAULT_BACKUP_OPTIONS, ...JSON.parse(saved) };
    } catch {
      /* ignore */
    }
    return DEFAULT_BACKUP_OPTIONS;
  });
  const [manifest, setManifest] = useState<BackupManifest | null>(null);
  const [loadingManifest, setLoadingManifest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ pct: number; label: string }>({ pct: 0, label: "" });
  const [skipped, setSkipped] = useState<string[]>([]);

  const [settings, setSettings] = useState<BackupSettings>(EMPTY_SETTINGS);
  const [runs, setRuns] = useState<BackupRun[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [runningRemote, setRunningRemote] = useState(false);

  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreData, setRestoreData] = useState(true);
  const [restoreMedia, setRestoreMedia] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [report, setReport] = useState<RestoreReport | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("ccm.backup.options", JSON.stringify(options));
  }, [options]);

  const loadState = async () => {
    try {
      const parsed = JSON.parse(await getBackupState()) as {
        settings: BackupSettings | null;
        runs: BackupRun[];
      };
      setSettings(parsed.settings ? { ...EMPTY_SETTINGS, ...parsed.settings } : EMPTY_SETTINGS);
      setRuns(parsed.runs ?? []);
    } catch (e) {
      toast.error(`Could not load backup settings: ${(e as Error).message}`);
    }
  };

  useEffect(() => {
    void loadState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inspect = async () => {
    setLoadingManifest(true);
    try {
      const m = await fetchManifest({ includeStorage: true, includeAuthUsers: true });
      setManifest(m);
    } catch (e) {
      toast.error(`Inventory failed: ${(e as Error).message}`);
    } finally {
      setLoadingManifest(false);
    }
  };

  const estimate = useMemo(() => {
    if (!manifest) return null;
    const media = options.includeMedia
      ? manifest.files
          .filter((f) => !options.maxFileBytes || f.size <= options.maxFileBytes)
          .reduce((a, f) => a + f.size, 0)
      : 0;
    return {
      rows: options.includeData ? manifest.totalRows : 0,
      sourceFiles: options.includeSource ? manifest.source.length : 0,
      mediaFiles: options.includeMedia ? manifest.files.length : 0,
      bytes: (options.includeSource ? manifest.sourceBytes : 0) + media,
    };
  }, [manifest, options]);

  const runBackup = async () => {
    setBusy(true);
    setSkipped([]);
    setProgress({ pct: 1, label: "Starting…" });
    try {
      const { blob, skipped: skips } = await buildBackupZip(options, setProgress);
      downloadBlob(blob, backupFilename());
      setSkipped(skips);
      toast.success(`Backup ready — ${mb(blob.size)} downloaded`);
      void loadState();
    } catch (e) {
      toast.error(`Backup failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const persistSettings = async () => {
    setSavingSettings(true);
    try {
      const patch = {
        frequency: settings.frequency,
        target: settings.target,
        github_owner: settings.github_owner || null,
        github_repo: settings.github_repo || null,
        github_branch: settings.github_branch || null,
        github_folder: settings.github_folder || "backups",
        include_storage: settings.include_storage,
        include_auth_users: settings.include_auth_users,
      };
      const parsed = JSON.parse(
        await saveBackupSettings({ data: { patchJson: JSON.stringify(patch) } }),
      ) as { settings: BackupSettings | null; runs: BackupRun[] };
      setSettings(parsed.settings ? { ...EMPTY_SETTINGS, ...parsed.settings } : EMPTY_SETTINGS);
      setRuns(parsed.runs ?? []);
      toast.success("Automatic backup settings saved");
    } catch (e) {
      toast.error(`Save failed: ${(e as Error).message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const runRemote = async () => {
    setRunningRemote(true);
    try {
      const out = JSON.parse(await runRemoteBackupNow()) as { ran: boolean; results: string[] };
      toast.success(out.results.join(" • ") || "Backup sent");
      void loadState();
    } catch (e) {
      toast.error(`Cloud backup failed: ${(e as Error).message}`);
    } finally {
      setRunningRemote(false);
    }
  };

  const doRestore = async () => {
    if (!restoreFile) return;
    setRestoring(true);
    setReport(null);
    setProgress({ pct: 1, label: "Opening archive…" });
    try {
      const r = await restoreBackupZip(restoreFile, { restoreData, restoreMedia }, setProgress);
      setReport(r);
      toast.success(
        `Restore finished — ${r.tables.reduce((a, t) => a + t.rows, 0)} rows, ${r.files} files`,
      );
      void loadState();
    } catch (e) {
      toast.error(`Restore failed: ${(e as Error).message}`);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Card id="backup">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-primary" />
          Backup &amp; Restore
        </CardTitle>
        <CardDescription>
          Download everything — source code, database, media, settings — as one ZIP, restore it
          later, or let the system back itself up automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="backup">
          <TabsList className="w-full flex-wrap">
            <TabsTrigger value="backup" className="flex-1">
              Backup
            </TabsTrigger>
            <TabsTrigger value="restore" className="flex-1">
              Restore
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex-1">
              Automatic
            </TabsTrigger>
          </TabsList>

          {/* ------------------------------ Backup ------------------------------ */}
          <TabsContent value="backup" className="space-y-4 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["includeSource", "Source code", "Every app file, ready to redeploy"],
                  ["includeData", "Database", "All tables and records as JSON"],
                  ["includeAuthUsers", "Accounts & roles", "Emails, ids and admin roles"],
                  ["includeMedia", "Photos, letters & documents", "Uploaded media files"],
                ] as const
              ).map(([key, label, hint]) => (
                <label
                  key={key}
                  className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer"
                >
                  <Checkbox
                    checked={options[key]}
                    onCheckedChange={(v) => setOptions((o) => ({ ...o, [key]: v === true }))}
                  />
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Skip media files larger than (MB)</Label>
                <Input
                  type="number"
                  min={0}
                  value={Math.round(options.maxFileBytes / 1048576)}
                  onChange={(e) =>
                    setOptions((o) => ({
                      ...o,
                      maxFileBytes: Math.max(0, Number(e.target.value) || 0) * 1048576,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Media size budget (MB)</Label>
                <Input
                  type="number"
                  min={0}
                  value={Math.round(options.mediaBudgetBytes / 1048576)}
                  onChange={(e) =>
                    setOptions((o) => ({
                      ...o,
                      mediaBudgetBytes: Math.max(0, Number(e.target.value) || 0) * 1048576,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={runBackup} disabled={busy}>
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download full backup
              </Button>
              <Button variant="outline" onClick={inspect} disabled={loadingManifest || busy}>
                {loadingManifest ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Database className="mr-2 h-4 w-4" />
                )}
                Check what will be included
              </Button>
            </div>

            {busy && (
              <div className="space-y-2">
                <Progress value={progress.pct} />
                <p className="text-xs text-muted-foreground">
                  {progress.pct}% — {progress.label}
                </p>
              </div>
            )}

            {estimate && !busy && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                <p>
                  <strong>{estimate.rows.toLocaleString()}</strong> database rows •{" "}
                  <strong>{estimate.sourceFiles}</strong> source files •{" "}
                  <strong>{estimate.mediaFiles}</strong> media files
                </p>
                <p className="text-xs text-muted-foreground">
                  Estimated uncompressed size {mb(estimate.bytes)}. Large archives take a few
                  minutes — keep this tab open.
                </p>
              </div>
            )}

            {skipped.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs space-y-1">
                <p className="font-medium">
                  {skipped.length} item(s) were not included (also listed in skipped.txt):
                </p>
                <ul className="list-disc pl-4 max-h-32 overflow-auto">
                  {skipped.slice(0, 25).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          {/* ------------------------------ Restore ----------------------------- */}
          <TabsContent value="restore" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Upload a backup ZIP to restore content and media. Matching records are updated,
              missing ones are re-created, and nothing is deleted.
            </p>
            <Input
              ref={fileRef}
              type="file"
              accept=".zip"
              onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={restoreData}
                  onCheckedChange={(v) => setRestoreData(v === true)}
                />
                Restore database records
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={restoreMedia}
                  onCheckedChange={(v) => setRestoreMedia(v === true)}
                />
                Restore photos &amp; documents
              </label>
            </div>
            <Button onClick={doRestore} disabled={!restoreFile || restoring}>
              {restoring ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Restore from backup
            </Button>
            {restoring && (
              <div className="space-y-2">
                <Progress value={progress.pct} />
                <p className="text-xs text-muted-foreground">
                  {progress.pct}% — {progress.label}
                </p>
              </div>
            )}
            {report && (
              <div className="rounded-lg border p-3 text-xs space-y-2">
                <p className="text-sm font-medium">Restore report</p>
                <ul className="max-h-40 overflow-auto space-y-0.5">
                  {report.tables.map((t) => (
                    <li key={t.table} className={t.error ? "text-destructive" : ""}>
                      {t.table}: {t.rows} rows{t.error ? ` — ${t.error}` : ""}
                    </li>
                  ))}
                </ul>
                <p>{report.files} media files restored.</p>
                {report.warnings.map((w) => (
                  <p key={w} className="text-amber-600 dark:text-amber-400">
                    {w}
                  </p>
                ))}
                {report.fileErrors.length > 0 && (
                  <p className="text-destructive">
                    {report.fileErrors.length} media file(s) failed.
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          {/* ----------------------------- Automatic ---------------------------- */}
          <TabsContent value="schedule" className="space-y-4 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Frequency</Label>
                <Select
                  value={settings.frequency}
                  onValueChange={(v) =>
                    setSettings((s) => ({ ...s, frequency: v as BackupSettings["frequency"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Destination</Label>
                <Select
                  value={settings.target}
                  onValueChange={(v) =>
                    setSettings((s) => ({ ...s, target: v as BackupSettings["target"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="github">GitHub repository</SelectItem>
                    <SelectItem value="drive">Google Drive</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">GitHub owner</Label>
                <Input
                  value={settings.github_owner ?? ""}
                  placeholder="your-username"
                  onChange={(e) => setSettings((s) => ({ ...s, github_owner: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">GitHub repository</Label>
                <Input
                  value={settings.github_repo ?? ""}
                  placeholder="ccm-backups"
                  onChange={(e) => setSettings((s) => ({ ...s, github_repo: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Branch (optional)</Label>
                <Input
                  value={settings.github_branch ?? ""}
                  placeholder="default branch"
                  onChange={(e) => setSettings((s) => ({ ...s, github_branch: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Folder</Label>
                <Input
                  value={settings.github_folder ?? ""}
                  placeholder="backups"
                  onChange={(e) => setSettings((s) => ({ ...s, github_folder: e.target.value }))}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={settings.include_auth_users}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s, include_auth_users: v === true }))
                }
              />
              Include the account list in automatic backups
            </label>

            <div className="flex flex-wrap gap-2">
              <Button onClick={persistSettings} disabled={savingSettings}>
                {savingSettings ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save schedule
              </Button>
              <Button variant="outline" onClick={runRemote} disabled={runningRemote}>
                {runningRemote ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="mr-2 h-4 w-4" />
                )}
                Back up to cloud now
              </Button>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {settings.last_run_at
                ? `Last automatic run ${new Date(settings.last_run_at).toLocaleString()} (${settings.last_status ?? "—"})`
                : "No automatic run yet."}{" "}
              Automatic backups store the database (and account list) as JSON; media stays in
              storage and is included in downloaded ZIPs.
            </p>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4" /> Recent backups
              </p>
              {runs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No backups recorded yet.</p>
              ) : (
                <ul className="space-y-1 max-h-56 overflow-auto text-xs">
                  {runs.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-2 rounded border p-2">
                      <Badge variant={r.status === "success" ? "secondary" : "destructive"}>
                        {r.status}
                      </Badge>
                      <span className="font-medium">{r.kind}</span>
                      <span className="text-muted-foreground">{r.target}</span>
                      <span className="text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">
                        {r.tables_count} tables • {r.files_count} files • {mb(Number(r.bytes))}
                      </span>
                      {r.location_url && (
                        <a
                          className="text-primary underline"
                          href={r.location_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          open
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
