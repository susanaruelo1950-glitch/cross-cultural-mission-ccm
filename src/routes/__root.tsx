import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppLayout } from "@/components/AppLayout";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-semibold text-foreground">404</h1>
        <h2 className="mt-4 font-display text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. You can try again or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#4A5D4E" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "CCM" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "author", content: "Cross-Cultural Mission" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Cross-Cultural Mission" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Cross-Cultural Mission — Church Planting Dashboard" },
      { property: "og:title", content: "Cross-Cultural Mission — Church Planting Dashboard" },
      { name: "twitter:title", content: "Cross-Cultural Mission — Church Planting Dashboard" },
      { name: "description", content: "Live snapshot of church planter pastors, phases, areas, prayer requests, and ministry reports from Cross-Cultural Mission." },
      { property: "og:description", content: "Live snapshot of church planter pastors, phases, areas, prayer requests, and ministry reports from Cross-Cultural Mission." },
      { name: "twitter:description", content: "Live snapshot of church planter pastors, phases, areas, prayer requests, and ministry reports from Cross-Cultural Mission." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783514945250-CCM_LOGO.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783514945250-CCM_LOGO.webp" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Cross-Cultural Mission",
          alternateName: "CCM",
          url: "https://cross-cultural-mission-ccm.lovable.app",
          logo: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp",
          description:
            "Church-planting operations platform surfacing church planter pastors, phases, areas, prayer requests, and ministry reports.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Cross-Cultural Mission",
          url: "https://cross-cultural-mission-ccm.lovable.app",
        }),
      },
      {
        children:
          "(function(){try{var k='ccm-theme';var s=localStorage.getItem(k);var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=(s==='light'||s==='dark')?s:(m?'dark':'light');var r=document.documentElement;if(t==='dark')r.classList.add('dark');r.style.colorScheme=t;}catch(e){}})();",
      },
      {
        // Anti-FOUC: apply saved palette + font before first paint so a user's
        // color/font choice doesn't flash the default theme on every navigation.
        children:
          "(function(){try{var P={'mission-warm':{l:{primary:'oklch(0.48 0.06 155)','primary-foreground':'oklch(0.985 0.006 90)',secondary:'oklch(0.55 0.12 45)','secondary-foreground':'oklch(0.985 0.006 90)',accent:'oklch(0.90 0.03 85)','accent-foreground':'oklch(0.32 0.04 150)',ring:'oklch(0.48 0.06 155)'},d:{primary:'oklch(0.70 0.08 155)','primary-foreground':'oklch(0.18 0.02 140)',secondary:'oklch(0.68 0.12 45)','secondary-foreground':'oklch(0.18 0.02 140)',accent:'oklch(0.32 0.04 150)','accent-foreground':'oklch(0.9 0.05 150)',ring:'oklch(0.70 0.08 155)'}},'ocean-deep':{l:{primary:'oklch(0.42 0.10 240)','primary-foreground':'oklch(0.99 0 0)',secondary:'oklch(0.62 0.11 210)','secondary-foreground':'oklch(0.99 0 0)',accent:'oklch(0.90 0.04 220)','accent-foreground':'oklch(0.30 0.09 240)',ring:'oklch(0.42 0.10 240)'},d:{primary:'oklch(0.72 0.11 220)','primary-foreground':'oklch(0.15 0.03 240)',secondary:'oklch(0.68 0.11 200)','secondary-foreground':'oklch(0.15 0.03 240)',accent:'oklch(0.35 0.06 220)','accent-foreground':'oklch(0.92 0.04 220)',ring:'oklch(0.72 0.11 220)'}},'midnight-indigo':{l:{primary:'oklch(0.42 0.18 275)','primary-foreground':'oklch(0.99 0 0)',secondary:'oklch(0.55 0.14 290)','secondary-foreground':'oklch(0.99 0 0)',accent:'oklch(0.92 0.03 275)','accent-foreground':'oklch(0.30 0.15 275)',ring:'oklch(0.42 0.18 275)'},d:{primary:'oklch(0.72 0.16 275)','primary-foreground':'oklch(0.15 0.05 275)',secondary:'oklch(0.65 0.14 295)','secondary-foreground':'oklch(0.15 0.05 275)',accent:'oklch(0.32 0.08 275)','accent-foreground':'oklch(0.92 0.04 275)',ring:'oklch(0.72 0.16 275)'}},'emerald-prestige':{l:{primary:'oklch(0.42 0.10 165)','primary-foreground':'oklch(0.99 0 0)',secondary:'oklch(0.68 0.10 85)','secondary-foreground':'oklch(0.20 0.04 60)',accent:'oklch(0.92 0.04 90)','accent-foreground':'oklch(0.28 0.08 165)',ring:'oklch(0.42 0.10 165)'},d:{primary:'oklch(0.70 0.10 165)','primary-foreground':'oklch(0.15 0.03 165)',secondary:'oklch(0.75 0.11 85)','secondary-foreground':'oklch(0.18 0.03 60)',accent:'oklch(0.32 0.06 165)','accent-foreground':'oklch(0.92 0.05 85)',ring:'oklch(0.70 0.10 165)'}},'sunset-blaze':{l:{primary:'oklch(0.62 0.19 35)','primary-foreground':'oklch(0.99 0 0)',secondary:'oklch(0.60 0.22 355)','secondary-foreground':'oklch(0.99 0 0)',accent:'oklch(0.92 0.05 40)','accent-foreground':'oklch(0.35 0.15 35)',ring:'oklch(0.62 0.19 35)'},d:{primary:'oklch(0.72 0.18 40)','primary-foreground':'oklch(0.15 0.05 40)',secondary:'oklch(0.68 0.20 355)','secondary-foreground':'oklch(0.15 0.05 355)',accent:'oklch(0.34 0.10 40)','accent-foreground':'oklch(0.92 0.06 40)',ring:'oklch(0.72 0.18 40)'}},'noir-gold':{l:{primary:'oklch(0.20 0.01 90)','primary-foreground':'oklch(0.95 0.04 85)',secondary:'oklch(0.72 0.11 85)','secondary-foreground':'oklch(0.15 0.02 90)',accent:'oklch(0.93 0.05 85)','accent-foreground':'oklch(0.22 0.02 90)',ring:'oklch(0.72 0.11 85)'},d:{primary:'oklch(0.85 0.12 85)','primary-foreground':'oklch(0.15 0.02 90)',secondary:'oklch(0.72 0.11 85)','secondary-foreground':'oklch(0.15 0.02 90)',accent:'oklch(0.32 0.05 85)','accent-foreground':'oklch(0.92 0.06 85)',ring:'oklch(0.85 0.12 85)'}},'cherry-blossom':{l:{primary:'oklch(0.58 0.14 350)','primary-foreground':'oklch(0.99 0 0)',secondary:'oklch(0.72 0.12 355)','secondary-foreground':'oklch(0.99 0 0)',accent:'oklch(0.94 0.04 350)','accent-foreground':'oklch(0.32 0.12 350)',ring:'oklch(0.58 0.14 350)'},d:{primary:'oklch(0.75 0.13 350)','primary-foreground':'oklch(0.18 0.04 350)',secondary:'oklch(0.78 0.11 355)','secondary-foreground':'oklch(0.18 0.04 350)',accent:'oklch(0.34 0.08 350)','accent-foreground':'oklch(0.94 0.05 350)',ring:'oklch(0.75 0.13 350)'}},'slate-steel':{l:{primary:'oklch(0.35 0.02 250)','primary-foreground':'oklch(0.99 0 0)',secondary:'oklch(0.55 0.03 250)','secondary-foreground':'oklch(0.99 0 0)',accent:'oklch(0.92 0.01 250)','accent-foreground':'oklch(0.28 0.02 250)',ring:'oklch(0.35 0.02 250)'},d:{primary:'oklch(0.75 0.02 250)','primary-foreground':'oklch(0.18 0.02 250)',secondary:'oklch(0.65 0.02 250)','secondary-foreground':'oklch(0.18 0.02 250)',accent:'oklch(0.32 0.02 250)','accent-foreground':'oklch(0.92 0.01 250)',ring:'oklch(0.75 0.02 250)'}}};var F={'space-grotesk-dm-sans':{d:'Space Grotesk',s:'DM Sans',h:'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap'},'syne-jakarta':{d:'Syne',s:'Plus Jakarta Sans',h:'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap'},'instrument-serif-work-sans':{d:'Instrument Serif',s:'Work Sans',h:'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Work+Sans:wght@400;500;600;700&display=swap'},'dm-serif-fira-sans':{d:'DM Serif Display',s:'Fira Sans',h:'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Fira+Sans:wght@400;500;600;700&display=swap'},'cormorant-karla':{d:'Cormorant Garamond',s:'Karla',h:'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Karla:wght@400;500;600;700&display=swap'},'lora-nunito-sans':{d:'Lora',s:'Nunito Sans',h:'https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Nunito+Sans:wght@400;600;700&display=swap'},'bebas-neue-barlow':{d:'Bebas Neue',s:'Barlow',h:'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700&display=swap'},'outfit-figtree':{d:'Outfit',s:'Figtree',h:'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap'},'libre-baskerville-ibm-plex':{d:'Libre Baskerville',s:'IBM Plex Sans',h:'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Libre+Baskerville:wght@400;700&display=swap'},'fraunces-inter':{d:'Fraunces',s:'Inter',h:'https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap'},'manrope-manrope':{d:'Manrope',s:'Manrope',h:'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap'},'urbanist-epilogue':{d:'Urbanist',s:'Epilogue',h:'https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;600;700&family=Urbanist:wght@500;600;700;800&display=swap'},'jetbrains-work-sans':{d:'JetBrains Mono',s:'Work Sans',h:'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Work+Sans:wght@400;500;600;700&display=swap'},'merriweather-source-sans':{d:'Merriweather',s:'Source Sans 3',h:'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&family=Source+Sans+3:wght@400;500;600;700&display=swap'}};var r=document.documentElement;var isDark=r.classList.contains('dark');function lum(h){h=h.replace('#','');var R=parseInt(h.slice(0,2),16)/255,G=parseInt(h.slice(2,4),16)/255,B=parseInt(h.slice(4,6),16)/255;function f(c){return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);}return 0.2126*f(R)+0.7152*f(G)+0.0722*f(B);}function fg(h){var w=(1.05)/(lum(h)+0.05);var b=(lum(h)+0.05)/(0.05+lum('#111111'));return w>=b?'#ffffff':'#111111';}var cp=null;try{cp=JSON.parse(localStorage.getItem('ccm-custom-palette')||'null');}catch(e){}if(cp&&cp.primary&&cp.secondary&&cp.accent){r.style.setProperty('--primary',cp.primary);r.style.setProperty('--primary-foreground',fg(cp.primary));r.style.setProperty('--secondary',cp.secondary);r.style.setProperty('--secondary-foreground',fg(cp.secondary));r.style.setProperty('--accent',cp.accent);r.style.setProperty('--accent-foreground',fg(cp.accent));r.style.setProperty('--ring',cp.primary);}else{var pid=localStorage.getItem('ccm-palette');var pal=pid&&P[pid];if(pal){var t=isDark?pal.d:pal.l;for(var k in t)r.style.setProperty('--'+k,t[k]);}}var fid=localStorage.getItem('ccm-fontpair');var f=fid&&F[fid];if(f){var l=document.createElement('link');l.id='ccm-custom-font-link';l.rel='stylesheet';l.href=f.h;document.head.appendChild(l);r.style.setProperty('--font-display','\"'+f.d+'\", ui-serif, Georgia, serif');r.style.setProperty('--font-sans','\"'+f.s+'\", ui-sans-serif, system-ui, sans-serif');}}catch(e){}})();",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </QueryClientProvider>
  );
}
