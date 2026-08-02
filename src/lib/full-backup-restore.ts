import JSZip from "jszip";
import { BACKUP_TABLES, MAX_RESTORE_FILE_BYTES } from "./backup-tables";
import { logBackupRun, restoreBackupFile, restoreBackupTable } from "./full-backup.functions";
import type { Progress } from "./full-backup-zip";

export interface RestoreOptions {
  restoreData: boolean;
  restoreMedia: boolean;
}

export interface RestoreReport {
  tables: { table: string; rows: number; error?: string }[];
  files: number;
  fileErrors: string[];
  warnings: string[];
}

function bytesToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(bin);
}

/** Restores a backup ZIP produced by buildBackupZip. Never deletes existing rows. */
export async function restoreBackupZip(
  file: File,
  options: RestoreOptions,
  onProgress: Progress,
): Promise<RestoreReport> {
  const report: RestoreReport = { tables: [], files: 0, fileErrors: [], warnings: [] };
  onProgress({ pct: 2, label: "Opening archive…" });
  const zip = await JSZip.loadAsync(file);

  if (!zip.file("manifest.json")) {
    report.warnings.push("manifest.json missing — this may not be a CCM backup archive.");
  }

  if (options.restoreData) {
    for (let i = 0; i < BACKUP_TABLES.length; i++) {
      const table = BACKUP_TABLES[i];
      const entry = zip.file(`database/${table}.json`);
      onProgress({
        pct: 5 + Math.round((i / BACKUP_TABLES.length) * 55),
        label: `Restoring ${table}…`,
      });
      if (!entry) continue;
      let rows: Record<string, unknown>[] = [];
      try {
        rows = JSON.parse(await entry.async("string")) as Record<string, unknown>[];
      } catch (e) {
        report.tables.push({ table, rows: 0, error: `unreadable: ${(e as Error).message}` });
        continue;
      }
      let inserted = 0;
      let error: string | undefined;
      for (let from = 0; from < rows.length; from += 200) {
        const slice = rows.slice(from, from + 200);
        try {
          await restoreBackupTable({ data: { table, rowsJson: JSON.stringify(slice) } });
          inserted += slice.length;
        } catch (e) {
          error = (e as Error).message;
          break;
        }
      }
      report.tables.push({ table, rows: inserted, error });
    }

    if (zip.file("database/_auth_users.json")) {
      report.warnings.push(
        "Account list found but not restored: passwords cannot be exported. Users sign in again and roles apply from user_roles.",
      );
    }
  }

  if (options.restoreMedia) {
    const media = Object.values(zip.files).filter(
      (f) => !f.dir && f.name.startsWith("media/"),
    );
    for (let i = 0; i < media.length; i++) {
      const f = media[i];
      onProgress({
        pct: 62 + Math.round((i / Math.max(1, media.length)) * 36),
        label: `Uploading media ${i + 1}/${media.length}`,
      });
      const rel = f.name.slice("media/".length);
      const slash = rel.indexOf("/");
      if (slash < 1) continue;
      const bucket = rel.slice(0, slash);
      const path = rel.slice(slash + 1);
      try {
        const buf = await f.async("arraybuffer");
        if (buf.byteLength > MAX_RESTORE_FILE_BYTES) {
          report.fileErrors.push(`${rel}: too large to restore in-app`);
          continue;
        }
        await restoreBackupFile({ data: { bucket, path, base64: bytesToBase64(buf) } });
        report.files++;
      } catch (e) {
        report.fileErrors.push(`${rel}: ${(e as Error).message}`);
      }
    }
  }

  try {
    await logBackupRun({
      data: {
        kind: "restore",
        target: "upload",
        status: report.tables.some((t) => t.error) || report.fileErrors.length ? "partial" : "success",
        detail: [
          ...report.tables.filter((t) => t.error).map((t) => `${t.table}: ${t.error}`),
          ...report.fileErrors.slice(0, 20),
        ].join(" | "),
        tables_count: report.tables.length,
        files_count: report.files,
        bytes: file.size,
      },
    });
  } catch {
    /* best-effort */
  }

  onProgress({ pct: 100, label: "Restore complete" });
  return report;
}
