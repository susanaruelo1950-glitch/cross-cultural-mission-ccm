import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Map as MapIcon,
  HeartHandshake,
  FileText,
  Wallet,
  FolderOpen,
  Sparkles,
  ShieldCheck,
  Menu,
  Search,
  Bell,
  Cross,
  Layers,
  UserPlus,
  Upload,
  Heart,
  BarChart3,
  Wand2,
} from "lucide-react";
import { useState, type ReactNode, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/missionaries", label: "Missionaries", icon: Users },
  { to: "/phases", label: "Phases & Areas", icon: Layers },
  { to: "/map", label: "Mission Map", icon: MapIcon },
  { to: "/pray", label: "Prayer Mode", icon: Heart },
  { to: "/prayer", label: "Prayer Center", icon: HeartHandshake },
  { to: "/reports", label: "Ministry Reports", icon: FileText },
  { to: "/summaries", label: "AI Summaries", icon: Wand2 },
  { to: "/analytics", label: "Annual Analytics", icon: BarChart3 },
  { to: "/support", label: "Support Center", icon: Wallet },
  { to: "/documents", label: "Documents", icon: FolderOpen },
  { to: "/manage", label: "Manage", icon: UserPlus },
  { to: "/import", label: "Import / Export", icon: Upload },
  { to: "/assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/admin", label: "Admin", icon: ShieldCheck },
] as const;

const mobileNav = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/missionaries", label: "People", icon: Users },
  { to: "/map", label: "Map", icon: MapIcon },
  { to: "/pray", label: "Pray", icon: Heart },
  { to: "/analytics", label: "Stats", icon: BarChart3 },
] as const;

function useActive() {
  return useRouterState({ select: (s) => s.location.pathname });
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useActive();
  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Primary">
      {nav.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
              active
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3 px-4 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl gradient-mission text-white shadow-soft">
        <Cross className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <div className="font-display text-lg font-semibold leading-tight text-sidebar-foreground">
          Great Commission
        </div>
        <div className="truncate text-xs text-muted-foreground">Mission Management</div>
      </div>
    </Link>
  );
}

function MobileBottomNav() {
  const pathname = useActive();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      aria-label="Mobile primary"
    >
      <ul className="grid grid-cols-5">
        {mobileNav.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:bg-accent",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function HeaderSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    navigate({ to: "/missionaries", search: { q: q.trim() || undefined } });
  }
  return (
    <form onSubmit={submit} role="search" className="relative min-w-0">
      <label htmlFor="global-search" className="sr-only">Search missionaries, churches, areas</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        id="global-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search missionaries, churches, areas..."
        className="h-10 rounded-full bg-muted/50 pl-9"
        type="search"
        enterKeyHint="search"
      />
    </form>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      {/* Skip to content — visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lift"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-sidebar-border bg-sidebar lg:block" aria-label="Sidebar">
        <Brand />
        <NavItems />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-4">
            <p className="font-display text-sm font-semibold text-sidebar-accent-foreground">
              "How beautiful are the feet..."
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Romans 10:15</p>
          </div>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md lg:ml-72">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
                  <Menu className="h-5 w-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <Brand />
                <NavItems onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <div className="grid h-8 w-8 place-items-center rounded-xl gradient-mission text-white">
                <Cross className="h-4 w-4" aria-hidden />
              </div>
              <span className="font-display text-sm font-semibold">Great Commission</span>
            </Link>
          </div>
          <HeaderSearch />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Notifications">
              <Bell className="h-5 w-5" aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="lg:pl-72 focus:outline-none">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-10">
          {children}
        </div>
      </main>

      <MobileBottomNav />
      <Toaster position="top-center" />
    </div>
  );
}
