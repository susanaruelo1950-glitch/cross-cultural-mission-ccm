import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { missionaries } from "@/lib/mission-data";

const BASE_URL = "https://cross-cultural-mission-ccm.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/missionaries", changefreq: "weekly", priority: "0.9" },
          { path: "/map", changefreq: "weekly", priority: "0.8" },
          { path: "/phases", changefreq: "weekly", priority: "0.7" },
          { path: "/prayer", changefreq: "daily", priority: "0.8" },
          { path: "/pray", changefreq: "weekly", priority: "0.6" },
          { path: "/reports", changefreq: "weekly", priority: "0.7" },
          { path: "/support", changefreq: "weekly", priority: "0.7" },
          { path: "/documents", changefreq: "monthly", priority: "0.5" },
          { path: "/assistant", changefreq: "monthly", priority: "0.4" },
          { path: "/summaries", changefreq: "monthly", priority: "0.4" },
          { path: "/analytics", changefreq: "monthly", priority: "0.4" },
          { path: "/auth", changefreq: "yearly", priority: "0.2" },
          { path: "/import", changefreq: "yearly", priority: "0.2" },
          { path: "/manage", changefreq: "yearly", priority: "0.2" },
          { path: "/admin", changefreq: "yearly", priority: "0.2" },
        ];
        const dynamicEntries: SitemapEntry[] = missionaries.map((m) => ({
          path: `/missionaries/${m.id}`,
          changefreq: "weekly",
          priority: "0.6",
        }));
        const entries = [...staticEntries, ...dynamicEntries];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
