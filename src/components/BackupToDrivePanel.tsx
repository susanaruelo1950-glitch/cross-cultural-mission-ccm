import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Cloud, CloudUpload, ExternalLink, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createBackupToDrive } from "@/lib/backup.functions";

interface BackupResult {
  folderName: string;
  folderUrl: string;
  tables: number;
  filesUploaded: number;
  filesFailed: number;
  errors: string[];
}

export function BackupToDrivePanel() {
  const runBackup = useServerFn(createBackupToDrive);
  const [includeStorage, setIncludeStorage] = useState(true);
  const [includeAuthUsers, setIncludeAuthUsers] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BackupResult | null>(null);

  async function onRun() {
    setRunning(true);
    setResult(null);
    const t = toast.loading("Backing up to Google Drive… this may take a few minutes.");
    try {
      const res = (await runBackup({ data: { includeStorage, includeAuthUsers } })) as BackupResult;
      setResult(res);
      toast.success(
        `Backup complete: ${res.tables} tables, ${res.filesUploaded} files uploaded${
          res.filesFailed ? `, ${res.filesFailed} failed` : ""
        }.`,
        { id: t },
      );
    } catch (e) {
      toast.error(`Backup failed: ${(e as Error).message}`, { id: t });
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card className="card-soft p-6">
      <div className="flex items-center gap-2">
        <Cloud className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-semibold">Backup to Google Drive</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Exports every database table (plus optional storage files and auth users) into a timestamped
        folder in the connected Google Drive account. Use <code>data.json</code> with the{" "}
        <a href="/import" className="underline">Import</a> page to restore on another Lovable account.
      </p>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="bkp-storage"
            checked={includeStorage}
            onCheckedChange={(v) => setIncludeStorage(v === true)}
          />
          <Label htmlFor="bkp-storage" className="cursor-pointer">
            Include storage files (photos, letters, documents) — slower
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="bkp-auth"
            checked={includeAuthUsers}
            onCheckedChange={(v) => setIncludeAuthUsers(v === true)}
          />
          <Label htmlFor="bkp-auth" className="cursor-pointer">
            Include auth users list (emails & metadata only, no passwords)
          </Label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="rounded-full" onClick={onRun} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
          {running ? "Backing up…" : "Run backup now"}
        </Button>
        {result && (
          <Button asChild variant="outline" className="rounded-full">
            <a href={result.folderUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> Open folder
            </a>
          </Button>
        )}
      </div>

      {result && (
        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <div><strong>Folder:</strong> {result.folderName}</div>
          <div><strong>Tables:</strong> {result.tables}</div>
          <div><strong>Files uploaded:</strong> {result.filesUploaded}</div>
          {result.filesFailed > 0 && (
            <div className="text-destructive"><strong>Files failed:</strong> {result.filesFailed}</div>
          )}
          {result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-muted-foreground">
                {result.errors.length} error{result.errors.length === 1 ? "" : "s"} (first 20)
              </summary>
              <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </Card>
  );
}
