/**
 * Server-only helpers behind the admin backup/restore server functions.
 * Holds the admin authorization guard plus all privileged reads and writes.
 * Payloads cross the wire as JSON strings to keep them serialization-safe.
 */
import { BACKUP_BUCKETS, BACKUP_TABLES, TABLE_PK } from "./backup-tables";
import { dumpTables, getAdmin, listStorage } from "./backup-core.server";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Throws unless the calling user has the admin role. */
export async function assertAdmin(context: unknown): Promise<void> {
  const ctx = context as { supabase: any; userId: string };
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(`Role check failed: ${error.message}`);
  if (!data) throw new Error("Forbidden: admin only");
}

export function actorEmailOf(context: unknown): string {
  const ctx = context as { claims?: { email?: string } | null; userId: string };
  return ctx.claims?.email ?? ctx.userId;
}

/** Row counts, storage inventory and source-file index for a backup plan. */
export async function buildManifest(opts: {
  includeStorage?: boolean;
  includeAuthUsers?: boolean;
}): Promise<string> {
  const admin = (await getAdmin()) as any;

  const tables: { table: string; rows: number }[] = [];
  for (const table of BACKUP_TABLES) {
    const { count, error } = await admin.from(table).select("*", { count: "exact", head: true });
    tables.push({ table, rows: error ? 0 : (count ?? 0) });
  }

  let files: Awaited<ReturnType<typeof listStorage>>["files"] = [];
  let storageErrors: string[] = [];
  if (opts.includeStorage) {
    const out = await listStorage(admin);
    files = out.files;
    storageErrors = out.errors;
  }

  const { fileIndex } = await import("./brilliant-codebase.server");
  const source = fileIndex();

  let authUsers = false;
  if (opts.includeAuthUsers) {
    const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    authUsers = !error;
  }

  return JSON.stringify({
    createdAt: new Date().toISOString(),
    tables,
    totalRows: tables.reduce((a, t) => a + t.rows, 0),
    buckets: BACKUP_BUCKETS,
    files: files.map((f) => ({ bucket: f.bucket, path: f.path, size: f.size, mime: f.mime })),
    filesBytes: files.reduce((a, f) => a + f.size, 0),
    storageErrors,
    source: source.map((s: { path: string; bytes: number }) => ({ path: s.path, bytes: s.bytes })),
    sourceBytes: source.reduce((a: number, s: { bytes: number }) => a + s.bytes, 0),
    authUsers,
  });
}

export async function readTablePage(table: string, from: number, limit: number): Promise<string> {
  if (!(BACKUP_TABLES as readonly string[]).includes(table)) throw new Error(`Unknown table ${table}`);
  const admin = (await getAdmin()) as any;
  const { data, error } = await admin.from(table).select("*").range(from, from + limit - 1);
  if (error) throw new Error(`${table}: ${error.message}`);
  return JSON.stringify(data ?? []);
}

export async function readAuthUsers(): Promise<string> {
  const admin = (await getAdmin()) as any;
  const { dump } = await dumpTables(admin, { includeAuthUsers: true });
  return JSON.stringify(dump.__auth_users ?? []);
}

export async function readSourceFiles(paths: string[]): Promise<string> {
  const { CODEBASE } = await import("./brilliant-codebase.server");
  const map = CODEBASE as unknown as Record<string, string>;
  const out: { path: string; content: string }[] = [];
  for (const p of paths) {
    const key = p.startsWith("/") ? p : `/${p}`;
    const content = map[key] ?? map[p];
    if (typeof content === "string") out.push({ path: p.replace(/^\//, ""), content });
  }
  return JSON.stringify(out);
}

export async function signPaths(bucket: string, paths: string[]): Promise<string> {
  if (!(BACKUP_BUCKETS as readonly string[]).includes(bucket)) throw new Error(`Unknown bucket ${bucket}`);
  const admin = (await getAdmin()) as any;
  const { data, error } = await admin.storage.from(bucket).createSignedUrls(paths, 60 * 30);
  if (error) throw new Error(`Sign failed: ${error.message}`);
  return JSON.stringify(
    (data ?? []).map((d: any) => ({ path: d.path ?? "", url: d.signedUrl ?? "" })),
  );
}

export async function insertRun(
  run: {
    kind: string;
    target: string;
    status: string;
    detail?: string;
    tables_count?: number;
    files_count?: number;
    bytes?: number;
  },
  actorEmail: string,
): Promise<{ ok: boolean }> {
  const admin = (await getAdmin()) as any;
  const { error } = await admin.from("backup_runs").insert({
    kind: run.kind,
    target: run.target,
    status: run.status,
    detail: run.detail?.slice(0, 2000) ?? null,
    tables_count: run.tables_count ?? 0,
    files_count: run.files_count ?? 0,
    bytes: run.bytes ?? 0,
    actor_email: actorEmail,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Upsert a batch of rows back into a table during restore. */
export async function upsertRows(table: string, rowsJson: string): Promise<{ inserted: number }> {
  if (!(BACKUP_TABLES as readonly string[]).includes(table)) throw new Error(`Unknown table ${table}`);
  const rows = JSON.parse(rowsJson) as Record<string, unknown>[];
  if (!Array.isArray(rows) || rows.length === 0) return { inserted: 0 };
  const admin = (await getAdmin()) as any;
  const onConflict = TABLE_PK[table] ?? "id";
  const { error } = await admin.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
  return { inserted: rows.length };
}

export async function uploadRestoredFile(input: {
  bucket: string;
  path: string;
  base64: string;
  contentType?: string;
}): Promise<{ ok: boolean }> {
  if (!(BACKUP_BUCKETS as readonly string[]).includes(input.bucket)) {
    throw new Error(`Unknown bucket ${input.bucket}`);
  }
  const admin = (await getAdmin()) as any;
  const bin = atob(input.base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const { error } = await admin.storage.from(input.bucket).upload(input.path, bytes, {
    contentType: input.contentType || "application/octet-stream",
    upsert: true,
  });
  if (error) throw new Error(`${input.bucket}/${input.path}: ${error.message}`);
  return { ok: true };
}

/** Backup schedule settings + recent run history for the admin panel. */
export async function readBackupState(): Promise<string> {
  const admin = (await getAdmin()) as any;
  const settings = await admin.from("backup_settings").select("*").limit(1).maybeSingle();
  const runs = await admin
    .from("backup_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  return JSON.stringify({ settings: settings.data ?? null, runs: runs.data ?? [] });
}

export async function saveBackupSettings(patchJson: string): Promise<string> {
  const admin = (await getAdmin()) as any;
  const patch = JSON.parse(patchJson) as Record<string, unknown>;
  const existing = await admin.from("backup_settings").select("id").limit(1).maybeSingle();
  if (existing.data?.id) {
    const { error } = await admin.from("backup_settings").update(patch).eq("id", existing.data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from("backup_settings").insert({ ...patch, singleton: true });
    if (error) throw new Error(error.message);
  }
  return readBackupState();
}
