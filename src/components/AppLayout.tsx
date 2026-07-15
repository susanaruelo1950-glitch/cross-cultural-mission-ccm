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
  
  Layers,
  UserPlus,
  Upload,
  Heart,
  BarChart3,
  Wand2,
  LogIn,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { useState, type ReactNode, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useMissionaryRealtime } from "@/hooks/use-missionary-realtime";
import { useGlobalRealtime } from "@/hooks/use-global-realtime";
import { LiveUpdatesIndicator } from "@/components/LiveUpdatesIndicator";
import { NotificationBell } from "@/components/NotificationBell";
import { ScriptureOfTheDay } from "@/components/ScriptureOfTheDay";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HighContrastToggle } from "@/components/HighContrastToggle";
import { ThemeCustomizer } from "@/components/ThemeCustomizer";
import ccmLogo from "@/assets/ccm-logo.png.asset.json";

type Role = "public" | "any-auth" | "admin";
type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  role?: Role;
};

const nav: readonly NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/missionaries", label: "Missionaries", icon: Users },
  { to: "/phases", label: "Phases & Areas", icon: Layers },
  { to: "/map", label: "Mission Map", icon: MapIcon },
  { to: "/pray", label: "Prayer Mode", icon: Heart },
  { to: "/prayer", label: "Prayer Center", icon: HeartHandshake },
  { to: "/reports", label: "Ministry Reports", icon: FileText },
  { to: "/summaries", label: "AI Summaries", icon: Wand2, role: "admin" },
  { to: "/analytics", label: "Annual Analytics", icon: BarChart3 },
  { to: "/support", label: "Support Center", icon: Wallet },
  { to: "/documents", label: "Documents", icon: FolderOpen },
  { to: "/manage", label: "Manage", icon: UserPlus, role: "admin" },
  { to: "/import", label: "Import / Export", icon: Upload, role: "admin" },
  { to: "/assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/admin", label: "Admin", icon: ShieldCheck, role: "admin" },
];

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
  const { isAdmin } = useAuth();
  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Primary">
      {nav
        .filter((item) => item.role !== "admin" || isAdmin)
        .map(({ to, label, icon: Icon }) => {
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
      <img
        src={ccmLogo.url}
        alt="Cross-Cultural Mission logo"
        className="h-11 w-11 shrink-0 rounded-2xl object-cover shadow-soft ring-1 ring-border"
      />
      <div className="min-w-0">
        <div className="font-display text-lg font-semibold leading-tight text-sidebar-foreground">
          Cross-Cultural Mission
        </div>
        <div className="truncate text-xs text-muted-foreground">CCM · Mission Management</div>
      </div>
    </Link>
  );
}

function MobileBottomNav() {
  const pathname = useActive();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      aria-label="Quick navigation"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-5">
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
        dir="ltr"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
      />
    </form>
  );
}

function AuthButton() {
  const { user, isAdmin, isCoordinator, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Button asChild size="sm" className="rounded-full">
        <Link to="/auth">
          <LogIn className="h-4 w-4" /> <span className="hidden sm:inline">Sign in</span>
        </Link>
      </Button>
    );
  }

  const label = user.email ?? "Account";
  const roleLabel = isAdmin ? "Admin" : isCoordinator ? "Coordinator" : "Supporter";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 rounded-full" aria-label="Account menu">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-primary">
            <UserIcon className="h-3.5 w-3.5" aria-hidden />
          </div>
          <span className="hidden max-w-[140px] truncate text-xs font-medium sm:inline">
            {label}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="truncate">{label}</div>
          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
            {roleLabel}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin ? (
          <DropdownMenuItem onSelect={() => navigate({ to: "/admin" })}>
            <ShieldCheck className="h-4 w-4" /> Admin panel
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [deskOpen, setDeskOpen] = useState(true);
  useMissionaryRealtime();
  useGlobalRealtime();
  return (
    <div className="min-h-screen bg-background">
      {/* Skip to content — visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lift"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar (collapsible) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:block",
          deskOpen ? "w-72" : "w-0 overflow-hidden",
        )}
        aria-label="Sidebar"
        aria-hidden={!deskOpen}
      >
        <Brand />
        <NavItems />
      </aside>

      {/* Top bar */}
      <header
        className={cn(
          "sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md transition-[margin] duration-200",
          deskOpen && "lg:ml-72",
        )}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" aria-label="Open navigation menu">
                  <Menu className="h-5 w-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <Brand />
                <NavItems onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <Button
              variant="ghost"
              size="icon"
              className="hidden shrink-0 lg:inline-flex"
              onClick={() => setDeskOpen((v) => !v)}
              aria-label={deskOpen ? "Hide sidebar" : "Show sidebar"}
              aria-pressed={!deskOpen}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </Button>
            <Link to="/" className="flex min-w-0 items-center gap-2 lg:hidden">
              <img src={ccmLogo.url} alt="CCM logo" className="h-8 w-8 shrink-0 rounded-xl object-cover ring-1 ring-border" />
              <span className="truncate font-display text-sm font-semibold tracking-tight">Cross-Cultural Mission</span>
            </Link>
            <div className="hidden min-w-0 flex-1 lg:block">
              <HeaderSearch />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <LiveUpdatesIndicator />
              <HighContrastToggle />
            </div>
            <ThemeCustomizer />
            <ThemeToggle />
            <NotificationBell />
            <AuthButton />
          </div>
        </div>
        {/* Mobile search — full width row so header text no longer wraps. */}
        <div className="border-t border-border/60 px-3 pb-2 pt-2 lg:hidden">
          <HeaderSearch />
        </div>
        <div className="border-t border-border/60 bg-primary/[0.03] px-3 py-2 sm:px-6">
          <ScriptureOfTheDay compact />
        </div>
      </header>


      <main
        id="main-content"
        tabIndex={-1}
        className={cn("focus:outline-none transition-[padding] duration-200", deskOpen && "lg:pl-72")}
      >
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-10">
          {children}
        </div>
      </main>

      <MobileBottomNav />
      <Toaster position="top-center" />
    </div>
  );
}

