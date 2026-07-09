import { supabase } from "@/integrations/supabase/client";

export type ActivityAction = "create" | "update" | "delete" | "restore";

export interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

/** Compute a shallow diff between two objects (top-level keys only). */
export function diffFields(before: Record<string, unknown> | null, after: Record<string, unknown> | null): FieldChange[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const out: FieldChange[] = [];
  for (const k of keys) {
    const a = before?.[k];
    const b = after?.[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out.push({ field: k, before: a ?? null, after: b ?? null });
    }
  }
  return out;
}

export async function logActivity(params: {
  entityType: string;
  entityId: string;
  action: ActivityAction;
  summary: string;
  changes?: FieldChange[];
}) {
  if (typeof window === "undefined") return;
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return; // anonymous edits (unlikely) aren't logged
    await supabase.from("activity_log").insert({
      entity_type: params.entityType,
      entity_id: params.entityId,
      action: params.action,
      actor_id: user.id,
      actor_email: user.email ?? null,
      summary: params.summary,
      changes: (params.changes ?? []) as unknown as never,
    });
  } catch (err) {
    console.warn("[activity-log] insert failed:", err);
  }
}
