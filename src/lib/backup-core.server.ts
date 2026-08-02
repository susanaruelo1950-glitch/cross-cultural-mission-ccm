/**
 * Server-only backup engine. Used by the admin backup server functions and by
 * the scheduled backup hook. Never import this from client code.
 */
import { BACKUP_TABLES, BACKUP_BUCKETS } from "./backup-tables";

const GH_GATEWAY = "https://connector-gateway.lovable.dev/github";
const DRIVE_GATEWAY = "https://connector-gateway.lovable.dev/google_drive";

export interface DumpResult {
  dump: Record<string, unknown>;
  errors: string[];
  tables: number;
  rows: number;
}

type AdminClient = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

export async function getAdmin(): Promise<AdminClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Read every row of every backed-up table (paged). */
export async function dumpTables(
  admin: AdminClient,
  opts: { includeAuthUsers?: boolean; actor?: string } = {},
): Promise<DumpResult> {
  const errors: string[] = [];
  let rows = 0;
  const dump: Record<string, unknown> = {
    __meta: {
      app: "Cross-Cultural Ministry",
      createdAt: new Date().toISOString(),
      version: 2,
      actor: opts.actor ?? "system",
      tables: BACKUP_TABLES,
      buckets: BACKUP_BUCKETS,
    },
  };

  for (const table of BACKUP_TABLES) {
    try {
      const all: unknown[] = [];
      const pageSize = 1000;
      let from = 0;
      for (;;) {
        const { data, error } = await (
          admin.from as unknown as (t: string) => ReturnType<AdminClient["from"]>
        )(table)
          .select("*")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const page = (data ?? []) as unknown[];
        all.push(...page);
        if (page.length < pageSize) break;
        from += pageSize;
      }
      dump[table] = all;
      rows += all.length;
    } catch (e) {
      errors.push(`table ${table}: ${(e as Error).message}`);
      dump[table] = [];
    }
  }

  if (opts.includeAuthUsers) {
    try {
      const users: Array<Record<string, unknown>> = [];
      let page = 1;
      for (;;) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        for (const u of data.users) {
          users.push({
            id: u.id,
            email: u.email,
            phone: u.phone,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            email_confirmed_at: u.email_confirmed_at,
            user_metadata: u.user_metadata,
            app_metadata: u.app_metadata,
          });
        }
        if (data.users.length < 200) break;
        page++;
      }
      dump.__auth_users = users;
    } catch (e) {
      errors.push(`auth users: ${(e as Error).message}`);
    }
  }

  return { dump, errors, tables: BACKUP_TABLES.length, rows };
}

export interface StorageFile {
  bucket: string;
  path: string;
  size: number;
  mime: string;
  updatedAt: string | null;
}

/** Recursively list every object in every backed-up bucket. */
export async function listStorage(admin: AdminClient): Promise<{
  files: StorageFile[];
  errors: string[];
}> {
  const files: StorageFile[] = [];
  const errors: string[] = [];

  for (const bucket of BACKUP_BUCKETS) {
    const walk = async (prefix: string): Promise<void> => {
      let offset = 0;
      for (;;) {
        const { data, error } = await admin.storage
          .from(bucket)
          .list(prefix, { limit: 1000, offset });
        if (error) throw error;
        const items = data ?? [];
        if (items.length === 0) break;
        for (const it of items) {
          const full = prefix ? `${prefix}/${it.name}` : it.name;
          if (!it.id && !it.metadata) {
            await walk(full);
          } else {
            const meta = (it.metadata ?? {}) as Record<string, unknown>;
            files.push({
              bucket,
              path: full,
              size: Number(meta.size ?? 0),
              mime: String(meta.mimetype ?? "application/octet-stream"),
              updatedAt: it.updated_at ?? null,
            });
          }
        }
        if (items.length < 1000) break;
        offset += 1000;
      }
    };
    try {
      await walk("");
    } catch (e) {
      errors.push(`bucket ${bucket}: ${(e as Error).message}`);
    }
  }

  return { files, errors };
}

/* ------------------------------ GitHub target ----------------------------- */

function ghHeaders(): Record<string, string> {
  const lov = process.env["LOVABLE_API_KEY"];
  const gh = process.env["GITHUB_API_KEY"];
  if (!lov || !gh) throw new Error("GitHub connector is not configured");
  return {
    Authorization: `Bearer ${lov}`,
    "X-Connection-Api-Key": gh,
    Accept: "application/vnd.github+json",
  };
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export async function pushJsonToGithub(opts: {
  owner: string;
  repo: string;
  branch?: string;
  folder?: string;
  payload: string;
  message: string;
}): Promise<{ url: string; path: string; branch: string }> {
  const { owner, repo, payload, message } = opts;
  const folder = (opts.folder ?? "backups").replace(/^\/+|\/+$/g, "");

  const repoRes = await fetch(`${GH_GATEWAY}/repos/${owner}/${repo}`, { headers: ghHeaders() });
  if (!repoRes.ok) {
    throw new Error(`GitHub repo access failed [${repoRes.status}]: ${await repoRes.text()}`);
  }
  const info = (await repoRes.json()) as { default_branch: string };
  const branch = opts.branch?.trim() || info.default_branch;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const content = toBase64(payload);

  const put = async (path: string, msg: string) => {
    const url = `${GH_GATEWAY}/repos/${owner}/${repo}/contents/${path}`;
    let sha: string | undefined;
    const existing = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, {
      headers: ghHeaders(),
    });
    if (existing.ok) sha = ((await existing.json()) as { sha?: string }).sha;
    const res = await fetch(url, {
      method: "PUT",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, content, branch, sha }),
    });
    if (!res.ok) throw new Error(`GitHub upload failed [${res.status}]: ${await res.text()}`);
    return (await res.json()) as { content: { html_url: string; path: string } };
  };

  const snap = await put(`${folder}/data-${stamp}.json`, message);
  try {
    await put(`${folder}/latest.json`, `${message} [latest]`);
  } catch {
    /* non-fatal */
  }
  return { url: snap.content.html_url, path: snap.content.path, branch };
}

/* ------------------------------ Drive target ------------------------------ */

function driveHeaders(): Record<string, string> {
  const lov = process.env["LOVABLE_API_KEY"];
  const drv = process.env["GOOGLE_DRIVE_API_KEY"];
  if (!lov || !drv) throw new Error("Google Drive connector is not configured");
  return { Authorization: `Bearer ${lov}`, "X-Connection-Api-Key": drv };
}

export async function driveCreateFolder(name: string, parentId?: string): Promise<string> {
  const res = await fetch(`${DRIVE_GATEWAY}/drive/v3/files?fields=id`, {
    method: "POST",
    headers: { ...driveHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    }),
  });
  if (!res.ok) throw new Error(`Drive folder create failed [${res.status}]: ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

export async function driveUpload(
  name: string,
  mime: string,
  body: Uint8Array | string,
  parentId: string,
): Promise<void> {
  const boundary = "----ccm" + Math.random().toString(36).slice(2);
  const enc = new TextEncoder();
  const bytes = typeof body === "string" ? enc.encode(body) : body;
  const pre = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify({ name, parents: [parentId] })}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,
  );
  const post = enc.encode(`\r\n--${boundary}--`);
  const buf = new Uint8Array(pre.length + bytes.length + post.length);
  buf.set(pre, 0);
  buf.set(bytes, pre.length);
  buf.set(post, pre.length + bytes.length);
  const res = await fetch(`${DRIVE_GATEWAY}/upload/drive/v3/files?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: { ...driveHeaders(), "Content-Type": `multipart/related; boundary=${boundary}` },
    body: buf,
  });
  if (!res.ok) throw new Error(`Drive upload failed [${res.status}]: ${await res.text()}`);
}

/* --------------------------- Scheduled backup ---------------------------- */

export interface ScheduleSettings {
  frequency: "off" | "daily" | "weekly" | "monthly";
  target: "github" | "drive" | "both";
  github_owner: string | null;
  github_repo: string | null;
  github_branch: string | null;
  github_folder: string | null;
  include_storage: boolean;
  include_auth_users: boolean;
  last_run_at: string | null;
}

/** True when the configured frequency means a run is due now. */
export function isDue(s: ScheduleSettings, now = new Date()): boolean {
  if (s.frequency === "off") return false;
  if (!s.last_run_at) return true;
  const last = new Date(s.last_run_at).getTime();
  const days = (now.getTime() - last) / 86_400_000;
  if (s.frequency === "daily") return days >= 0.95;
  if (s.frequency === "weekly") return days >= 6.95;
  return days >= 27.95;
}

/** Runs the configured automatic backup if it is due. */
export async function runScheduledBackup(
  force = false,
): Promise<{ ran: boolean; reason?: string; results: string[] }> {
  const admin = await getAdmin();
  const { data: settings, error } = await admin
    .from("backup_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Settings read failed: ${error.message}`);
  if (!settings) return { ran: false, reason: "no settings row", results: [] };

  const s = settings as unknown as ScheduleSettings;
  if (!force && !isDue(s)) return { ran: false, reason: "not due", results: [] };

  const { dump, errors, tables } = await dumpTables(admin, {
    includeAuthUsers: s.include_auth_users,
    actor: "scheduled",
  });
  const payload = JSON.stringify(dump, null, 2);
  const stamp = new Date().toISOString().slice(0, 19);
  const results: string[] = [];
  let status = "success";
  let locationUrl: string | null = null;

  if (s.target === "github" || s.target === "both") {
    try {
      if (!s.github_owner || !s.github_repo) throw new Error("GitHub owner/repo not configured");
      const out = await pushJsonToGithub({
        owner: s.github_owner,
        repo: s.github_repo,
        branch: s.github_branch ?? undefined,
        folder: s.github_folder ?? undefined,
        payload,
        message: `CCM scheduled backup ${stamp}`,
      });
      locationUrl = out.url;
      results.push(`github: ${out.path}`);
    } catch (e) {
      status = "partial";
      results.push(`github failed: ${(e as Error).message}`);
    }
  }

  if (s.target === "drive" || s.target === "both") {
    try {
      const folderId = await driveCreateFolder(
        `CCM-Backup-${stamp.replace(/[:.]/g, "-")}`,
      );
      await driveUpload("data.json", "application/json", payload, folderId);
      locationUrl = locationUrl ?? `https://drive.google.com/drive/folders/${folderId}`;
      results.push(`drive: folder ${folderId}`);
    } catch (e) {
      status = "partial";
      results.push(`drive failed: ${(e as Error).message}`);
    }
  }

  if (results.every((r) => r.includes("failed"))) status = "failed";

  await admin.from("backup_runs").insert({
    kind: "scheduled",
    target: s.target,
    status,
    detail: [...results, ...errors].join(" | ").slice(0, 2000),
    tables_count: tables,
    files_count: 0,
    bytes: payload.length,
    location_url: locationUrl,
    actor_email: "scheduled",
  });

  await admin
    .from("backup_settings")
    .update({ last_run_at: new Date().toISOString(), last_status: status })
    .eq("singleton", true);

  return { ran: true, results };
}
