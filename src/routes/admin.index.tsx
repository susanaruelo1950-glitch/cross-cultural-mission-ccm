import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Users, Key, History, Database, Lock, LogIn, CalendarCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { CoordinatorAssignments } from "@/components/CoordinatorAssignments";
import { ScriptureManager } from "@/components/ScriptureManager";
import { ThankYouLettersAdmin } from "@/components/ThankYouLettersAdmin";
import { AdminHistoryDrawer } from "@/components/AdminHistoryDrawer";
import { AdminActivityLog } from "@/components/AdminActivityLog";
import { AnnouncementsManager } from "@/components/AnnouncementsManager";
import { PartnersManager } from "@/components/PartnersManager";
import { RealtimeDebugPanel } from "@/components/RealtimeDebugPanel";
import { PermissionError } from "@/components/PermissionError";
import { BackupToDrivePanel } from "@/components/BackupToDrivePanel";
import { BackupToGithubPanel } from "@/components/BackupToGithubPanel";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Console — Cross-Cultural Ministry" },
      { name: "description", content: "Administrator tools for Cross-Cultural Ministry — scriptures, roles, coordinators." },
      { property: "og:title", content: "Admin Console — Cross-Cultural Ministry" },
      { property: "og:description", content: "Administrator tools for Cross-Cultural Ministry — scriptures, roles, coordinators." },
      { property: "og:url", content: "https://cross-cultural-mission-ccm.lovable.app/admin" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp" },
      { name: "twitter:title", content: "Admin Console — Cross-Cultural Ministry" },
      { name: "twitter:description", content: "Administrator tools for Cross-Cultural Ministry — scriptures, roles, coordinators." },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp" },
    ],
    links: [{ rel: "canonical", href: "https://cross-cultural-mission-ccm.lovable.app/admin" }],
  }),
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
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!user) {
    return (
      <Card className="card-soft mx-auto max-w-md p-8 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-primary" aria-hidden />
        <h1 className="font-display text-2xl font-semibold">Admin sign-in required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please sign in with your Admin account to access this panel.
        </p>
        <Button asChild className="mt-4 rounded-full">
          <Link to="/auth"><LogIn className="h-4 w-4" /> Sign in</Link>
        </Button>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <PermissionError
        title="Admins only"
        message="Your account doesn't have admin permissions. Ask an administrator to grant you access."
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Admin Panel</h1>
          <p className="mt-1 text-muted-foreground">
            Signed in as <strong>{user.email}</strong>. Post ministry updates and photos from any
            missionary profile page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/admin/roles"><Users className="h-4 w-4" /> Manage roles</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/admin/monthly"><CalendarCheck className="h-4 w-4" /> Monthly report</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/admin/activity"><History className="h-4 w-4" /> Activity log</Link>
          </Button>
          <AdminHistoryDrawer />
        </div>
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

      <ScriptureManager />

      <AnnouncementsManager />

      <PartnersManager />



      <ThankYouLettersAdmin />

      <CoordinatorAssignments />

      <AdminActivityLog />

      <AdminBackupPanel />

      <BackupToDrivePanel />


      <BackupToGithubPanel />

      <RealtimeDebugPanel />

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
