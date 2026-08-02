/**
 * Server-only helpers behind the admin backup/restore server functions.
 * Holds the admin authorization guard plus all privileged reads and writes.
 */
import { BACKUP_BUCKETS, BACKUP_TABLES, TABLE_PK } from "./backup-tables";
import { dumpTables, getAdmin, listStorage } from "./backup-core.server";

interface AuthContext {
  supabase: {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          c: string,
          v: unknown,
        ) => {
          eq: (
            c: string,
            v: unknown,
          ) => { maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }> };
        };
      };
    };
  };
  userId: string;
  claims?: { email?: string } | null;
}

/** Throws unless the calling user has the admin role. */
export async function assertAdmin(context: AuthContext): Promise<void> {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(`Role check failed: ${error.message}`);
  if (!data) throw new Error("Forbidden: admin only");
}

/** Row counts, storage inventory and source-file index for a backup plan. */
export async function buildManifest(opts: {
  includeStorage?: boolean;
  includeAuthUsers?: boolean;
}) {
  const admin = await getAdmin();

  const tables: { table: string; rows: number }[] = [];
  for (const table of BACKUP_TABLES) {
    const { count, error } = await (
      admin.from as unknown as (t: string) => ReturnType<typeof admin.from>
    )(table).select("*", { count: "exact", head: true });
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

  let authUsers = 0;
  if (opts.includeAuthUsers) {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    authUsers = data?.users?.length ? -1 : 0; // -1 = "available, count unknown"
  }

  return {
    createdAt: new Date().toISOString(),
    tables,
    totalRows: tables.reduce((a, t) => a + t.rows, 0),
    buckets: BACKUP_BUCKETS,
    files: files.map((f) => ({ bucket: f.bucket, path: f.path, size: f.size, mime: f.mime })),
    filesBytes: files.reduce((a, f) => a + f.size, 0),
    storageErrors,
    source: source.map((s) => ({ path: s.path, bytes: s.bytes })),
    sourceBytes: source.reduce((a, s) => a + s.bytes, 0),
    authUsers,
  };
}

export async function readTablePage(table: string, from: number, limit: number) {
  if (!(BACKUP_TABLES as readonly string[]).includes(table)) throw new Error(`Unknown table ${table}`);
  const admin = await getAdmin();
  const { data, error } = await (
    admin.from as unknown as (t: string) => ReturnType<typeof admin.from>
  )(table)
    .select("*")
    .range(from, from + limit - 1);
  if (error) throw new Error(`${table}: ${error.message}`);
  return { rows: (data ?? []) as Record<string, unknown>[] };
}

export async function readAuthUsers() {
  const admin = await getAdmin();
  const { dump } = await dumpTables(admin, { includeAuthUsers: true });
  return { users: (dump.__auth_users ?? []) as Record<string, unknown>[] };
}

export async function readSourceFiles(paths: string[]) {
  const { CODEBASE } = await import("./brilliant-codebase.server");
  const out: { path: string; content: string }[] = [];
  for (const p of paths) {
    const key = p.startsWith("/") ? p : `/${p}`;
    const content = CODEBASE[key];
    if (typeof content === "string") out.push({ path: p.replace(/^\//, ""), content });
  }
  return { files: out };
}

export async function signPaths(bucket: string, paths: string[]) {
  if (!(BACKUP_BUCKETS as readonly string[]).includes(bucket)) throw new Error(`Unknown bucket ${bucket}`);
  const admin = await getAdmin();
  const { data, error } = await admin.storage.from(bucket).createSignedUrls(paths, 60 * 30);
  if (error) throw new Error(`Sign failed: ${error.message}`);
  return {
    urls: (data ?? []).map((d) => ({ path: d.path ?? "", url: d.signedUrl ?? "", error: d.error })),
  };
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
) {
  const admin = await getAdmin();
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
export async function upsertRows(
  table: string,
  rows: Record<string, unknown>[],
  wipeFirst: boolean,
) {
  if (!(BACKUP_TABLES as readonly string[]).includes(table)) throw new Error(`Unknown table ${table}`);
  const admin = await getAdmin();
  const from = (admin.from as unknown as (t: string) => ReturnType<typeof admin.from>)(table);

  if (wipeFirst) {
    const del = await (from as unknown as { delete: () => { not: (a: string, b: string, c: string) => Promise<{ error: { message: string } | null }> } })
      .delete()
      .not("__none__", "is", null)
      .catch(() => ({ error: null }));
    if ((del as { error?: { message: string } | null })?.error) {
      // fall through — a failed wipe still allows upsert
    }
  }

  if (rows.length === 0) return { inserted: 0 };
  const onConflict = TABLE_PK[table] ?? "id";
  const { error } = await (
    from as unknown as {
      upsert: (
        r: Record<string, unknown>[],
        o: { onConflict: string },
      ) => Promise<{ error: { message: string } | null }>;
    }
  ).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
  return { inserted: rows.length };
}

export async function uploadRestoredFile(input: {
  bucket: string;
  path: string;
  base64: string;
  contentType?: string;
}) {
  if (!(BACKUP_BUCKETS as readonly string[]).includes(input.bucket)) {
    throw new Error(`Unknown bucket ${input.bucket}`);
  }
  const admin = await getAdmin();
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
