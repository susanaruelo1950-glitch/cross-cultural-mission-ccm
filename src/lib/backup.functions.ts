import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";

// Every user-content table in the public schema. Keep in sync with supabase-tables.
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

const BUCKETS = ["missionary-photos", "ministry-updates", "thank-you-letters", "documents"] as const;

function driveHeaders() {
  const lov = process.env.LOVABLE_API_KEY;
  const drv = process.env.GOOGLE_DRIVE_API_KEY;
  if (!lov || !drv) throw new Error("Google Drive connector is not configured");
  return {
    Authorization: `Bearer ${lov}`,
    "X-Connection-Api-Key": drv,
  } as Record<string, string>;
}

async function driveCreateFolder(name: string, parentId?: string): Promise<string> {
  const res = await fetch(`${GATEWAY}/drive/v3/files?fields=id`, {
    method: "POST",
    headers: { ...driveHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    }),
  });
  if (!res.ok) throw new Error(`Drive folder create failed [${res.status}]: ${await res.text()}`);
  const j = (await res.json()) as { id: string };
  return j.id;
}

async function driveUpload(
  name: string,
  mime: string,
  body: Uint8Array | string,
  parentId: string,
): Promise<{ id: string; webViewLink?: string }> {
  const boundary = "----lovable" + Math.random().toString(36).slice(2);
  const enc = new TextEncoder();
  const bodyBytes = typeof body === "string" ? enc.encode(body) : body;
  const meta = JSON.stringify({ name, parents: [parentId] });
  const pre = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
      `--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,
  );
  const post = enc.encode(`\r\n--${boundary}--`);
  const buf = new Uint8Array(pre.length + bodyBytes.length + post.length);
  buf.set(pre, 0);
  buf.set(bodyBytes, pre.length);
  buf.set(post, pre.length + bodyBytes.length);
  const res = await fetch(
    `${GATEWAY}/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`,
    {
      method: "POST",
      headers: {
        ...driveHeaders(),
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: buf,
    },
  );
  if (!res.ok) throw new Error(`Drive upload failed [${res.status}]: ${await res.text()}`);
  return (await res.json()) as { id: string; webViewLink?: string };
}

export const createBackupToDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { includeStorage?: boolean; includeAuthUsers?: boolean }) => data)
  .handler(async ({ data, context }) => {
    // Authorize: caller must be admin
    const { data: adminRow, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(`Role check failed: ${roleErr.message}`);
    if (!adminRow) throw new Error("Forbidden: admin only");


    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date();
    const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const rootName = `CCM-Backup-${stamp}`;

    const errors: string[] = [];
    let filesUploaded = 0;
    let filesFailed = 0;

    // 1) Create Drive root folder
    const rootId = await driveCreateFolder(rootName);

    // 2) Dump tables
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
        // Page through in case a table is large
        const rows: unknown[] = [];
        const pageSize = 1000;
        let from = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: page, error } = await (supabaseAdmin.from as unknown as (
            table: string,
          ) => ReturnType<typeof supabaseAdmin.from>)(t)
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

    // 3) Auth users list (emails + roles, no passwords)
    if (data.includeAuthUsers) {
      try {
        const users: Array<Record<string, unknown>> = [];
        let page = 1;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: res, error } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage: 200,
          });
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

    // 4) Upload data.json
    await driveUpload(
      "data.json",
      "application/json",
      JSON.stringify(tableDump, null, 2),
      rootId,
    );

    // 5) Storage buckets
    if (data.includeStorage) {
      const storageRootId = await driveCreateFolder("storage", rootId);

      for (const bucket of BUCKETS) {
        let bucketFolderId: string;
        try {
          bucketFolderId = await driveCreateFolder(bucket, storageRootId);
        } catch (e) {
          errors.push(`bucket folder ${bucket}: ${(e as Error).message}`);
          continue;
        }

        // Recursively list all objects
        const paths: string[] = [];
        async function walk(prefix: string) {
          let offset = 0;
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { data: items, error } = await supabaseAdmin.storage
              .from(bucket)
              .list(prefix, { limit: 1000, offset });
            if (error) throw error;
            if (!items || items.length === 0) break;
            for (const it of items) {
              const full = prefix ? `${prefix}/${it.name}` : it.name;
              // Supabase marks folders by null id + no metadata
              if (!it.id && !it.metadata) {
                await walk(full);
              } else {
                paths.push(full);
              }
            }
            if (items.length < 1000) break;
            offset += 1000;
          }
        }

        try {
          await walk("");
        } catch (e) {
          errors.push(`list ${bucket}: ${(e as Error).message}`);
          continue;
        }

        // Map storage paths -> Drive subfolder IDs (created lazily)
        const folderCache = new Map<string, string>();
        folderCache.set("", bucketFolderId);
        async function ensureFolder(dirPath: string): Promise<string> {
          if (folderCache.has(dirPath)) return folderCache.get(dirPath)!;
          const parts = dirPath.split("/");
          const name = parts.pop()!;
          const parent = await ensureFolder(parts.join("/"));
          const id = await driveCreateFolder(name, parent);
          folderCache.set(dirPath, id);
          return id;
        }

        for (const p of paths) {
          try {
            const { data: blob, error } = await supabaseAdmin.storage
              .from(bucket)
              .download(p);
            if (error || !blob) throw error ?? new Error("empty");
            const bytes = new Uint8Array(await blob.arrayBuffer());
            const segs = p.split("/");
            const filename = segs.pop()!;
            const parentId = await ensureFolder(segs.join("/"));
            const mime = blob.type || "application/octet-stream";
            await driveUpload(filename, mime, bytes, parentId);
            filesUploaded++;
          } catch (e) {
            filesFailed++;
            errors.push(`${bucket}/${p}: ${(e as Error).message}`);
          }
        }
      }
    }

    return {
      ok: true,
      folderName: rootName,
      folderId: rootId,
      folderUrl: `https://drive.google.com/drive/folders/${rootId}`,
      tables: TABLES.length,
      filesUploaded,
      filesFailed,
      errors: errors.slice(0, 20),
    };
  });
