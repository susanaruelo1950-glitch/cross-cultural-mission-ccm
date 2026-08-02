import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only backup/restore RPCs. All payloads travel as JSON strings.
 * Authorization and privileged work live in backup-guard.server.ts.
 */

export const getBackupManifest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { includeStorage?: boolean; includeAuthUsers?: boolean }) => data)
  .handler(async ({ data, context }) => {
    const g = await import("@/lib/backup-guard.server");
    await g.assertAdmin(context);
    return g.buildManifest(data);
  });

export const getBackupTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { table: string; from: number; limit: number }) => data)
  .handler(async ({ data, context }) => {
    const g = await import("@/lib/backup-guard.server");
    await g.assertAdmin(context);
    return g.readTablePage(data.table, data.from, data.limit);
  });

export const getBackupAuthUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const g = await import("@/lib/backup-guard.server");
    await g.assertAdmin(context);
    return g.readAuthUsers();
  });

export const getBackupSourceChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { paths: string[] }) => data)
  .handler(async ({ data, context }) => {
    const g = await import("@/lib/backup-guard.server");
    await g.assertAdmin(context);
    return g.readSourceFiles(data.paths);
  });

export const getBackupFileUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bucket: string; paths: string[] }) => data)
  .handler(async ({ data, context }) => {
    const g = await import("@/lib/backup-guard.server");
    await g.assertAdmin(context);
    return g.signPaths(data.bucket, data.paths);
  });

export const getBackupState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const g = await import("@/lib/backup-guard.server");
    await g.assertAdmin(context);
    return g.readBackupState();
  });

export const saveBackupSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { patchJson: string }) => data)
  .handler(async ({ data, context }) => {
    const g = await import("@/lib/backup-guard.server");
    await g.assertAdmin(context);
    return g.saveBackupSettings(data.patchJson);
  });

export const logBackupRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      kind: string;
      target: string;
      status: string;
      detail?: string;
      tables_count?: number;
      files_count?: number;
      bytes?: number;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const g = await import("@/lib/backup-guard.server");
    await g.assertAdmin(context);
    return g.insertRun(data, g.actorEmailOf(context));
  });

export const restoreBackupTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { table: string; rowsJson: string }) => data)
  .handler(async ({ data, context }) => {
    const g = await import("@/lib/backup-guard.server");
    await g.assertAdmin(context);
    return g.upsertRows(data.table, data.rowsJson);
  });

export const restoreBackupFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { bucket: string; path: string; base64: string; contentType?: string }) => data,
  )
  .handler(async ({ data, context }) => {
    const g = await import("@/lib/backup-guard.server");
    await g.assertAdmin(context);
    return g.uploadRestoredFile(data);
  });

export const runRemoteBackupNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const g = await import("@/lib/backup-guard.server");
    await g.assertAdmin(context);
    const { runScheduledBackup } = await import("@/lib/backup-core.server");
    const out = await runScheduledBackup(true);
    return JSON.stringify(out);
  });
