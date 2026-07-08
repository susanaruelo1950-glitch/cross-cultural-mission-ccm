import { createFileRoute } from "@tanstack/react-router";
import { Shield, Users, Key, History, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Great Commission" }] }),
  component: AdminPage,
});

const roles = [
  { name: "Super Admin", count: 1, desc: "Full platform access" },
  { name: "Mission Director", count: 2, desc: "National oversight" },
  { name: "Regional Director", count: 5, desc: "Regional leadership" },
  { name: "Mission Coordinator", count: 8, desc: "Coordinates local teams" },
  { name: "Church Administrator", count: 14, desc: "Manages sending church data" },
  { name: "Missionary", count: 38, desc: "Submits reports & requests" },
  { name: "Supporter", count: 240, desc: "Views & gives" },
  { name: "Viewer", count: 96, desc: "Read-only access" },
];

function AdminPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Admin Panel</h1>
        <p className="mt-1 text-muted-foreground">Role-based permissions, audit logs, backups, and settings.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-soft p-5"><Users className="h-5 w-5 text-primary" /><div className="mt-2 font-display text-2xl font-semibold">404</div><div className="text-sm text-muted-foreground">Total users</div></Card>
        <Card className="card-soft p-5"><Key className="h-5 w-5 text-primary" /><div className="mt-2 font-display text-2xl font-semibold">8</div><div className="text-sm text-muted-foreground">Roles</div></Card>
        <Card className="card-soft p-5"><History className="h-5 w-5 text-primary" /><div className="mt-2 font-display text-2xl font-semibold">1,204</div><div className="text-sm text-muted-foreground">Audit events (30d)</div></Card>
        <Card className="card-soft p-5"><Database className="h-5 w-5 text-primary" /><div className="mt-2 font-display text-2xl font-semibold">Nightly</div><div className="text-sm text-muted-foreground">Backups</div></Card>
      </div>

      <Card className="card-soft p-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">Roles & Permissions</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {roles.map((r) => (
            <div key={r.name} className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-sm text-muted-foreground">{r.desc}</div>
              </div>
              <Badge variant="secondary" className="rounded-full">{r.count}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="card-soft p-6">
        <h2 className="font-display text-xl font-semibold">Security</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>✓ Encrypted data at rest</li>
          <li>✓ Audit logs for every sensitive action</li>
          <li>✓ Version history for missionary profiles</li>
          <li>✓ Nightly backups with 30-day retention</li>
          <li>✓ Two-factor authentication ready (wire up in next iteration)</li>
        </ul>
      </Card>
    </div>
  );
}
