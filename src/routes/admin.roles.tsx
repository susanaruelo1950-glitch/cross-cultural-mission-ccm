import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ShieldCheck, ShieldOff, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PermissionError } from "@/components/PermissionError";
import { logActivity } from "@/lib/activity-log";

export const Route = createFileRoute("/admin/roles")({
  head: () => ({
    meta: [
      { title: "Role Management — Admin — Cross-Cultural Ministry" },
      { name: "description", content: "Grant or revoke admin permissions for Cross-Cultural Ministry users." },
    ],
  }),
  component: RolesPage,
});

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  is_admin: boolean;
}

function RolesPage() {
  const { user, isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery<UserRow[]>({
    queryKey: ["admin", "users_with_roles"],
    queryFn: async () => {
      const [{ data: profs, error: pErr }, { data: rls, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name").order("email"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      const adminIds = new Set((rls ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
      return (profs ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        is_admin: adminIds.has(p.id),
      }));
    },
    enabled: !!user && isAdmin,
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((u) =>
      `${u.email ?? ""} ${u.full_name ?? ""}`.toLowerCase().includes(needle),
    );
  }, [q, users]);

  const adminCount = users.filter((u) => u.is_admin).length;

  async function toggleAdmin(u: UserRow) {
    if (u.id === user?.id && u.is_admin) {
      if (!confirm("You are removing your OWN admin permission. Continue?")) return;
    } else if (u.is_admin) {
      if (adminCount <= 1) { toast.error("At least one admin must remain."); return; }
      if (!confirm(`Revoke admin from ${u.email ?? "this user"}?`)) return;
    } else {
      if (!confirm(`Grant admin permission to ${u.email ?? "this user"}?`)) return;
    }
    setBusyId(u.id);
    try {
      if (u.is_admin) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", u.id)
          .eq("role", "admin");
        if (error) throw error;
        await logActivity({
          entityType: "user_role",
          entityId: u.id,
          action: "delete",
          summary: `Revoked admin from ${u.email ?? u.id}`,
        });
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: u.id, role: "admin" });
        if (error) throw error;
        await logActivity({
          entityType: "user_role",
          entityId: u.id,
          action: "create",
          summary: `Granted admin to ${u.email ?? u.id}`,
        });
      }
      toast.success("Role updated. The change takes effect on the user's next page load.");
      qc.invalidateQueries({ queryKey: ["admin", "users_with_roles"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Role change failed");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!user || !isAdmin) {
    return <PermissionError title="Admins only" message="This page is for administrators." />;
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin"><ChevronLeft className="h-4 w-4" /> Back to Admin</Link>
      </Button>

      <header>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Role Management</h1>
        <p className="mt-1 text-muted-foreground">
          Grant or revoke the admin permission. Changes are logged in the audit trail.
          Users see the new permission on their next sign-in or page refresh.
        </p>
      </header>

      <div className="relative max-w-md">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by email or name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
          aria-label="Search users"
        />
      </div>

      <Card className="card-soft divide-y divide-border p-0">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No users found.</div>
        ) : (
          filtered.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {u.full_name || u.email || u.id}
                  {u.id === user?.id ? (
                    <Badge variant="outline" className="ml-2 rounded-full text-xs">You</Badge>
                  ) : null}
                </div>
                <div className="truncate text-xs text-muted-foreground">{u.email ?? "—"}</div>
              </div>
              {u.is_admin ? (
                <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/15">Admin</Badge>
              ) : (
                <Badge variant="outline" className="rounded-full">Supporter</Badge>
              )}
              <Button
                variant={u.is_admin ? "outline" : "default"}
                size="sm"
                className="rounded-full"
                disabled={busyId === u.id}
                onClick={() => toggleAdmin(u)}
              >
                {u.is_admin ? (
                  <><ShieldOff className="h-4 w-4" /> Revoke admin</>
                ) : (
                  <><ShieldCheck className="h-4 w-4" /> Make admin</>
                )}
              </Button>
            </div>
          ))
        )}
      </Card>

      <p className="text-xs text-muted-foreground">
        Safeguards: you cannot remove the last remaining admin, and revoking your own admin
        access requires an extra confirmation.
      </p>
    </div>
  );
}
