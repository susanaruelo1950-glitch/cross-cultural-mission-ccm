import JSZip from "jszip";
import {
  getBackupAuthUsers,
  getBackupFileUrls,
  getBackupManifest,
  getBackupSourceChunk,
  getBackupTable,
  logBackupRun,
} from "./full-backup.functions";

export interface BackupManifest {
  createdAt: string;
  tables: { table: string; rows: number }[];
  totalRows: number;
  buckets: string[];
  files: { bucket: string; path: string; size: number; mime: string }[];
  filesBytes: number;
  storageErrors: string[];
  source: { path: string; bytes: number }[];
  sourceBytes: number;
  authUsers: boolean;
}

export interface BackupOptions {
  includeSource: boolean;
  includeData: boolean;
  includeAuthUsers: boolean;
  includeMedia: boolean;
  /** Skip individual media files larger than this (bytes). 0 = no limit. */
  maxFileBytes: number;
  /** Stop adding media once the archive reaches this many bytes. 0 = no limit. */
  mediaBudgetBytes: number;
}

export const DEFAULT_BACKUP_OPTIONS: BackupOptions = {
  includeSource: true,
  includeData: true,
  includeAuthUsers: true,
  includeMedia: true,
  maxFileBytes: 25 * 1024 * 1024,
  mediaBudgetBytes: 700 * 1024 * 1024,
};

export type Progress = (p: { pct: number; label: string }) => void;

export function fetchManifest(opts: {
  includeStorage: boolean;
  includeAuthUsers: boolean;
}): Promise<BackupManifest> {
  return getBackupManifest({ data: opts }).then((json) => JSON.parse(json) as BackupManifest);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Builds the full application backup in the browser and returns a ZIP blob.
 * Data, source and media are streamed from admin-only server functions.
 */
export async function buildBackupZip(
  options: BackupOptions,
  onProgress: Progress,
): Promise<{ blob: Blob; manifest: BackupManifest; skipped: string[] }> {
  const skipped: string[] = [];
  const zip = new JSZip();

  onProgress({ pct: 2, label: "Reading backup inventory…" });
  const manifest = await fetchManifest({
    includeStorage: options.includeMedia,
    includeAuthUsers: options.includeAuthUsers,
  });
  zip.file("manifest.json", JSON.stringify({ ...manifest, options }, null, 2));

  /* ------------------------------- database ------------------------------- */
  if (options.includeData) {
    const tables = manifest.tables;
    for (let i = 0; i < tables.length; i++) {
      const t = tables[i];
      onProgress({
        pct: 5 + Math.round((i / Math.max(1, tables.length)) * 35),
        label: `Database: ${t.table} (${t.rows} rows)`,
      });
      const rows: unknown[] = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        let page: unknown[] = [];
        try {
          page = JSON.parse(
            await getBackupTable({ data: { table: t.table, from, limit: pageSize } }),
          ) as unknown[];
        } catch (e) {
          skipped.push(`${t.table}: ${(e as Error).message}`);
          break;
        }
        rows.push(...page);
        if (page.length < pageSize) break;
      }
      zip.file(`database/${t.table}.json`, JSON.stringify(rows, null, 2));
    }

    if (options.includeAuthUsers && manifest.authUsers) {
      onProgress({ pct: 42, label: "Accounts and roles…" });
      try {
        zip.file("database/_auth_users.json", await getBackupAuthUsers());
      } catch (e) {
        skipped.push(`auth users: ${(e as Error).message}`);
      }
    }
  }

  /* -------------------------------- source -------------------------------- */
  if (options.includeSource) {
    const batches = chunk(
      manifest.source.map((s) => s.path),
      40,
    );
    for (let i = 0; i < batches.length; i++) {
      onProgress({
        pct: 45 + Math.round((i / Math.max(1, batches.length)) * 20),
        label: `Source code (${i + 1}/${batches.length})`,
      });
      try {
        const files = JSON.parse(
          await getBackupSourceChunk({ data: { paths: batches[i] } }),
        ) as { path: string; content: string }[];
        for (const f of files) zip.file(`source/${f.path}`, f.content);
      } catch (e) {
        skipped.push(`source batch ${i + 1}: ${(e as Error).message}`);
      }
    }
  }

  /* -------------------------------- media --------------------------------- */
  let mediaBytes = 0;
  if (options.includeMedia) {
    const eligible = manifest.files.filter((f) => {
      if (options.maxFileBytes && f.size > options.maxFileBytes) {
        skipped.push(`${f.bucket}/${f.path} (too large: ${Math.round(f.size / 1048576)} MB)`);
        return false;
      }
      return true;
    });

    const byBucket = new Map<string, typeof eligible>();
    for (const f of eligible) {
      const list = byBucket.get(f.bucket) ?? [];
      list.push(f);
      byBucket.set(f.bucket, list);
    }

    let done = 0;
    outer: for (const [bucket, list] of byBucket) {
      for (const batch of chunk(list, 40)) {
        let urls: { path: string; url: string }[] = [];
        try {
          urls = JSON.parse(
            await getBackupFileUrls({ data: { bucket, paths: batch.map((b) => b.path) } }),
          ) as { path: string; url: string }[];
        } catch (e) {
          skipped.push(`${bucket} signing: ${(e as Error).message}`);
          continue;
        }
        for (const u of urls) {
          if (options.mediaBudgetBytes && mediaBytes >= options.mediaBudgetBytes) {
            skipped.push("media size budget reached — remaining files listed in manifest.json");
            break outer;
          }
          done++;
          onProgress({
            pct: 66 + Math.round((done / Math.max(1, eligible.length)) * 26),
            label: `Media ${done}/${eligible.length}: ${u.path.split("/").pop() ?? ""}`,
          });
          if (!u.url) {
            skipped.push(`${bucket}/${u.path}: no signed URL`);
            continue;
          }
          try {
            const res = await fetch(u.url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buf = await res.arrayBuffer();
            mediaBytes += buf.byteLength;
            zip.file(`media/${bucket}/${u.path}`, buf);
          } catch (e) {
            skipped.push(`${bucket}/${u.path}: ${(e as Error).message}`);
          }
        }
      }
    }
  }

  zip.file("README.md", readme(manifest, options, skipped));
  if (skipped.length) zip.file("skipped.txt", skipped.join("\n"));

  onProgress({ pct: 94, label: "Compressing archive…" });
  const blob = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
    (meta) => onProgress({ pct: 94 + Math.round(meta.percent * 0.06), label: "Compressing…" }),
  );

  try {
    await logBackupRun({
      data: {
        kind: "manual",
        target: "download",
        status: skipped.length ? "partial" : "success",
        detail: skipped.slice(0, 40).join(" | "),
        tables_count: options.includeData ? manifest.tables.length : 0,
        files_count: options.includeMedia ? manifest.files.length : 0,
        bytes: blob.size,
      },
    });
  } catch {
    /* logging is best-effort */
  }

  onProgress({ pct: 100, label: "Backup ready" });
  return { blob, manifest, skipped };
}

function readme(m: BackupManifest, o: BackupOptions, skipped: string[]): string {
  return `# Cross-Cultural Ministry — Full Backup

Created: ${m.createdAt}

## What's inside
- \`manifest.json\` — inventory of every table, media file and source file, plus the options used.
- \`database/\` — one JSON file per table (${m.totalRows} rows total across ${m.tables.length} tables).
- \`database/_auth_users.json\` — account list (ids, emails, metadata). Passwords are never exported.
- \`source/\` — complete application source code (${m.source.length} files).
- \`media/<bucket>/…\` — uploaded photos, letters, receipts, partner logos and documents.
- \`skipped.txt\` — anything not included in this archive (${skipped.length} entries).

## Restoring
1. Open the app as an administrator and go to **Admin → Backup & Restore → Restore**.
2. Upload this ZIP. The restore imports \`database/*.json\` in dependency-safe order
   (regions → provinces → phases → areas → people → content) and re-uploads \`media/\`.
3. Existing rows with the same id are updated; new rows are inserted. Nothing is deleted.

Accounts cannot be recreated from a backup (passwords are not exportable). After a
restore onto a fresh backend, users sign up again and roles are re-applied from
\`database/user_roles.json\` once the matching user ids exist.

## Migrating to another platform
The \`source/\` folder is a complete project. Combine it with \`database/\` (import the
JSON into the new database) and \`media/\` (upload to the new storage buckets).

## Options used
${JSON.stringify(o, null, 2)}
`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function backupFilename(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `ccm-full-backup-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.zip`;
}
