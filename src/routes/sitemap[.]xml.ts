import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { missionaries } from "@/lib/mission-data";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticPaths = [
          "/",
          "/missionaries",
          "/map",
          "/prayer",
          "/reports",
          "/support",
          "/documents",
          "/assistant",
          "/admin",
        ];
        const paths = [
          ...staticPaths,
          ...missionaries.map((m) => `/missionaries/${m.id}`),
        ];
        const urls = paths.map(
          (p) => `  <url><loc>${BASE_URL}${p}</loc><changefreq>weekly</changefreq></url>`,
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
