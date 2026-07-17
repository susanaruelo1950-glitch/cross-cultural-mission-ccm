import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Github, ExternalLink, Loader2, UploadCloud } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { backupToGithub } from "@/lib/backup-github.functions";

interface Result {
  repoUrl: string;
  branch: string;
  snapshotPath: string;
  snapshotUrl: string;
  latestUrl?: string;
  tables: number;
  bytes: number;
  errors: string[];
}

const LS_KEY = "ccm.backup.github";

function loadPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      owner: string;
      repo: string;
      branch: string;
      folder: string;
    };
  } catch {
    return null;
  }
}

export function BackupToGithubPanel() {
  const run = useServerFn(backupToGithub);
  const saved = typeof window !== "undefined" ? loadPrefs() : null;
  const [owner, setOwner] = useState(saved?.owner ?? "");
  const [repo, setRepo] = useState(saved?.repo ?? "");
  const [branch, setBranch] = useState(saved?.branch ?? "");
  const [folder, setFolder] = useState(saved?.folder ?? "backups");
  const [includeAuthUsers, setIncludeAuthUsers] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function onRun() {
    if (!owner.trim() || !repo.trim()) {
      toast.error("Enter GitHub owner and repository name.");
      return;
    }
    setRunning(true);
    setResult(null);
    const t = toast.loading("Backing up to GitHub…");
    try {
      const res = (await run({
        data: {
          owner: owner.trim(),
          repo: repo.trim(),
          branch: branch.trim() || undefined,
          folder: folder.trim() || undefined,
          includeAuthUsers,
        },
      })) as Result;
      setResult(res);
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ owner, repo, branch, folder }),
      );
      toast.success(
        `Backup pushed to ${owner}/${repo}@${res.branch}${
          res.errors.length ? ` (${res.errors.length} warnings)` : ""
        }.`,
        { id: t },
      );
    } catch (e) {
      toast.error(`GitHub backup failed: ${(e as Error).message}`, { id: t });
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card className="card-soft p-6">
      <div className="flex items-center gap-2">
        <Github className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-semibold">
          Backup to GitHub
        </h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Commits a timestamped <code>data.json</code> plus a{" "}
        <code>latest.json</code> to the repo you choose. Uses the connected
        GitHub account — make sure that token has write access to the target
        repository.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="gh-owner">Owner (user or org)</Label>
          <Input
            id="gh-owner"
            placeholder="e.g. alfredkennethr"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="gh-repo">Repository</Label>
          <Input
            id="gh-repo"
            placeholder="e.g. ccm-backups"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="gh-branch">Branch (optional)</Label>
          <Input
            id="gh-branch"
            placeholder="default branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="gh-folder">Folder</Label>
          <Input
            id="gh-folder"
            placeholder="backups"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Checkbox
          id="gh-auth"
          checked={includeAuthUsers}
          onCheckedChange={(v) => setIncludeAuthUsers(v === true)}
        />
        <Label htmlFor="gh-auth" className="cursor-pointer">
          Include auth users list (emails & metadata only, no passwords)
        </Label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="rounded-full" onClick={onRun} disabled={running}>
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="h-4 w-4" />
          )}
          {running ? "Pushing…" : "Push backup to GitHub"}
        </Button>
        {result && (
          <Button asChild variant="outline" className="rounded-full">
            <a href={result.snapshotUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> View snapshot
            </a>
          </Button>
        )}
      </div>

      {result && (
        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <div>
            <strong>Repo:</strong>{" "}
            <a
              className="underline"
              href={result.repoUrl}
              target="_blank"
              rel="noreferrer"
            >
              {result.repoUrl}
            </a>{" "}
            (<code>{result.branch}</code>)
          </div>
          <div>
            <strong>Snapshot:</strong> <code>{result.snapshotPath}</code>
          </div>
          <div>
            <strong>Tables:</strong> {result.tables} · <strong>Size:</strong>{" "}
            {(result.bytes / 1024).toFixed(1)} KB
          </div>
          {result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-muted-foreground">
                {result.errors.length} warning
                {result.errors.length === 1 ? "" : "s"}
              </summary>
              <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <p className="mt-4 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        <strong>Code backup:</strong> Lovable syncs your source code to GitHub
        through the built-in integration. Open the <em>Plus (+) → GitHub →
        Connect project</em> menu to mirror the codebase to a repository —
        that's the supported path for full code backups.
      </p>
    </Card>
  );
}
