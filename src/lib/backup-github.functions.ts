import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/github";

const TABLES = [
  "regions",
  "provinces",
  "phases",
  "areas",
  "missionary_area_map",
  "missionary_extras",
  "missionary_photos",
  "ministry_updates",
  "thank_you_letters",
  "prayer_requests_db",
  "prayer_events",
  "announcements",
  "partners",
  "scriptures",
  "documents",
  "coordinator_assignments",
  "content_versions",
  "activity_log",
  "profiles",
  "user_roles",
] as const;

function ghHeaders() {
  const lov = process.env.LOVABLE_API_KEY;
  const gh = process.env.GITHUB_API_KEY;
  if (!lov || !gh) throw new Error("GitHub connector is not configured");
  return {
    Authorization: `Bearer ${lov}`,
    "X-Connection-Api-Key": gh,
    Accept: "application/vnd.github+json",
  } as Record<string, string>;
}

function b64(bytes: Uint8Array | string): string {
  const buf =
    typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  // btoa is available in the Worker runtime
  // eslint-disable-next-line no-undef
  return btoa(bin);
}

async function ghGet(path: string): Promise<Response> {
  return fetch(`${GATEWAY}${path}`, { headers: ghHeaders() });
}

async function ghPut(path: string, body: unknown): Promise<Response> {
  return fetch(`${GATEWAY}${path}`, {
    method: "PUT",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export const backupToGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      owner: string;
      repo: string;
      branch?: string;
      folder?: string;
      includeAuthUsers?: boolean;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    // Admin check
    const { data: adminRow, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(`Role check failed: ${roleErr.message}`);
    if (!adminRow) throw new Error("Forbidden: admin only");

    const owner = data.owner.trim();
    const repo = data.repo.trim();
    if (!owner || !repo) throw new Error("owner and repo are required");
    const folder = (data.folder ?? "backups").replace(/^\/+|\/+$/g, "");

    // Verify repo exists and resolve default branch if not provided
    const repoRes = await ghGet(`/repos/${owner}/${repo}`);
    if (!repoRes.ok) {
      throw new Error(
        `GitHub repo access failed [${repoRes.status}]: ${await repoRes.text()}`,
      );
    }
    const repoInfo = (await repoRes.json()) as {
      default_branch: string;
      html_url: string;
    };
    const branch = data.branch?.trim() || repoInfo.default_branch;

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const now = new Date();
    const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);

    const errors: string[] = [];
    const tableDump: Record<string, unknown> = {
      __meta: {
        createdAt: now.toISOString(),
        app: "cross-cultural-mission",
        version: 1,
        actor: context.claims?.email ?? context.userId,
      },
    };

    for (const t of TABLES) {
      try {
        const rows: unknown[] = [];
        const pageSize = 1000;
        let from = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: page, error } = await (
            supabaseAdmin.from as unknown as (
              table: string,
            ) => ReturnType<typeof supabaseAdmin.from>
          )(t)
            .select("*")
            .range(from, from + pageSize - 1);
          if (error) throw error;
          rows.push(...(page ?? []));
          if (!page || page.length < pageSize) break;
          from += pageSize;
        }
        tableDump[t] = rows;
      } catch (e) {
        errors.push(`table ${t}: ${(e as Error).message}`);
        tableDump[t] = [];
      }
    }

    if (data.includeAuthUsers) {
      try {
        const users: Array<Record<string, unknown>> = [];
        let page = 1;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: res, error } =
            await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
          if (error) throw error;
          for (const u of res.users) {
            users.push({
              id: u.id,
              email: u.email,
              phone: u.phone,
              created_at: u.created_at,
              last_sign_in_at: u.last_sign_in_at,
              user_metadata: u.user_metadata,
              app_metadata: u.app_metadata,
            });
          }
          if (res.users.length < 200) break;
          page++;
        }
        tableDump.__auth_users = users;
      } catch (e) {
        errors.push(`auth users: ${(e as Error).message}`);
      }
    }

    const jsonPath = `${folder}/data-${stamp}.json`;
    const latestPath = `${folder}/latest.json`;
    const payload = JSON.stringify(tableDump, null, 2);
    const content = b64(payload);

    async function putFile(path: string, message: string) {
      // Fetch existing sha (needed to update rather than fail on create)
      let sha: string | undefined;
      const existing = await ghGet(
        `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`,
      );
      if (existing.ok) {
        const j = (await existing.json()) as { sha?: string };
        sha = j.sha;
      }
      const res = await ghPut(
        `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`,
        { message, content, branch, sha },
      );
      if (!res.ok) {
        throw new Error(
          `GitHub upload failed [${res.status}]: ${await res.text()}`,
        );
      }
      return (await res.json()) as {
        content: { html_url: string; path: string };
      };
    }

    const commitMsg = `CCM backup ${stamp} (${TABLES.length} tables${
      data.includeAuthUsers ? " + auth users" : ""
    })`;

    const snap = await putFile(jsonPath, commitMsg);
    let latestUrl: string | undefined;
    try {
      const latest = await putFile(latestPath, `${commitMsg} [latest]`);
      latestUrl = latest.content.html_url;
    } catch (e) {
      errors.push(`latest.json: ${(e as Error).message}`);
    }

    return {
      ok: true,
      repoUrl: repoInfo.html_url,
      branch,
      snapshotPath: snap.content.path,
      snapshotUrl: snap.content.html_url,
      latestUrl,
      tables: TABLES.length,
      bytes: payload.length,
      errors: errors.slice(0, 20),
    };
  });
