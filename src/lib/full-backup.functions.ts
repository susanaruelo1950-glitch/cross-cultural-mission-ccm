import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Every handler below is admin-only; the guard lives in backup-guard.server.ts. */

export const getBackupManifest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { includeStorage?: boolean; includeAuthUsers?: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/backup-guard.server");
    await assertAdmin(context);
    const { buildManifest } = await import("@/lib/backup-guard.server");
    return buildManifest(data);
  });

export const getBackupTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { table: string; from: number; limit: number }) => data)
  .handler(async ({ data, context }) => {
    const { assertAdmin, readTablePage } = await import("@/lib/backup-guard.server");
    await assertAdmin(context);
    return readTablePage(data.table, data.from, data.limit);
  });

export const getBackupAuthUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, readAuthUsers } = await import("@/lib/backup-guard.server");
    await assertAdmin(context);
    return readAuthUsers();
  });

export const getBackupSourceChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { paths: string[] }) => data)
  .handler(async ({ data, context }) => {
    const { assertAdmin, readSourceFiles } = await import("@/lib/backup-guard.server");
    await assertAdmin(context);
    return readSourceFiles(data.paths);
  });

export const getBackupFileUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bucket: string; paths: string[] }) => data)
  .handler(async ({ data, context }) => {
    const { assertAdmin, signPaths } = await import("@/lib/backup-guard.server");
    await assertAdmin(context);
    return signPaths(data.bucket, data.paths);
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
    const { assertAdmin, insertRun } = await import("@/lib/backup-guard.server");
    await assertAdmin(context);
    return insertRun(data, context.claims?.email ?? context.userId);
  });

export const restoreBackupTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { table: string; rows: Record<string, unknown>[]; wipeFirst?: boolean }) => data,
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, upsertRows } = await import("@/lib/backup-guard.server");
    await assertAdmin(context);
    return upsertRows(data.table, data.rows, data.wipeFirst === true);
  });

export const restoreBackupFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { bucket: string; path: string; base64: string; contentType?: string }) => data,
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, uploadRestoredFile } = await import("@/lib/backup-guard.server");
    await assertAdmin(context);
    return uploadRestoredFile(data);
  });

export const runRemoteBackupNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/backup-guard.server");
    await assertAdmin(context);
    const { runScheduledBackup } = await import("@/lib/backup-core.server");
    return runScheduledBackup(true);
  });
