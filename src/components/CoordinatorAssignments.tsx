import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCog, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useDirectory } from "@/hooks/use-directory";

interface Assignment {
  id: string;
  user_id: string;
  area_id: string;
  created_at: string;
  profile?: { email: string | null; full_name: string | null } | null;
}

/**
 * Admin-only management: grant the `coordinator` role to a user by email
 * and assign them to one or more areas. Coordinators can then only edit
 * ministry updates, prayer requests, and photos for missionaries in
 * those areas (enforced by RLS via `is_coordinator_of_missionary`).
 */
export function CoordinatorAssignments() {
  const qc = useQueryClient();
  const { areas } = useDirectory();
  const [email, setEmail] = useState("");
  const [areaId, setAreaId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["coordinator_assignments"],
    queryFn: async (): Promise<Assignment[]> => {
      const { data, error } = await supabase
        .from("coordinator_assignments")
        .select("id, user_id, area_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = data ?? [];
      const userIds = Array.from(new Set(list.map((r) => r.user_id)));
      if (!userIds.length) return list;
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      const byId = new Map((profs ?? []).map((p) => [p.id, p]));
      return list.map((r) => ({ ...r, profile: byId.get(r.user_id) ?? null }));
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coordinator_assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment removed.");
      qc.invalidateQueries({ queryKey: ["coordinator_assignments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function assign() {
    const cleaned = email.trim().toLowerCase();
    if (!cleaned) return toast.error("Enter the coordinator's email.");
    if (!areaId) return toast.error("Pick an area.");
    setBusy(true);
    try {
      const { data: prof, error: pErr } = await supabase
        .from("profiles")
        .select("id, email")
        .ilike("email", cleaned)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!prof) {
        throw new Error("No user found with that email. Ask them to sign up first at /auth.");
      }
      // Grant coordinator role (no-op if already granted)
      const { error: rErr } = await supabase
        .from("user_roles")
        .insert({ user_id: prof.id, role: "coordinator" });
      if (rErr && !rErr.message.includes("duplicate")) throw rErr;

      const { error: aErr } = await supabase
        .from("coordinator_assignments")
        .insert({ user_id: prof.id, area_id: areaId });
      if (aErr && !aErr.message.includes("duplicate")) throw aErr;

      toast.success(`Assigned ${prof.email} to that area.`);
      setEmail("");
      setAreaId("");
      qc.invalidateQueries({ queryKey: ["coordinator_assignments"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign coordinator.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="card-soft p-6">
      <div className="mb-4 flex items-center gap-2">
        <UserCog className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-semibold">Coordinator Assignments</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Grant the coordinator role and scope them to a specific area. Coordinators can only edit
        ministry updates, prayer requests, and photos for missionaries in their assigned areas.
      </p>

      <div className="grid gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="grid gap-1.5">
          <Label htmlFor="ca-email">Coordinator email</Label>
          <Input
            id="ca-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pastor@example.com"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ca-area">Area</Label>
          <Select value={areaId} onValueChange={setAreaId}>
            <SelectTrigger id="ca-area"><SelectValue placeholder="Pick an area" /></SelectTrigger>
            <SelectContent>
              {areas.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={assign} disabled={busy} className="w-full rounded-full sm:w-auto">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Assign
          </Button>
        </div>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading assignments…</p>
        ) : !rows || rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No coordinators assigned yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const area = areas.find((a) => a.id === r.area_id);
              return (
                <li key={r.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {r.profile?.full_name || r.profile?.email || r.user_id}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {r.profile?.email ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full">{area?.name ?? r.area_id}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-full text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm("Remove this assignment?")) del.mutate(r.id);
                      }}
                      aria-label="Remove assignment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
