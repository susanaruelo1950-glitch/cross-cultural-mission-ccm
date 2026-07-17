// Bundles the app's source code + migrations as raw strings so the
// Brilliant Agent can reason about the actual implementation, not just data.
// Uses Vite's import.meta.glob — files are inlined at build time.

const rawSource = import.meta.glob("/src/**/*.{ts,tsx,css,md}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const rawMigrations = import.meta.glob("/supabase/migrations/**/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const rawRoot = import.meta.glob("/{package.json,AGENTS.md,README.md,vite.config.ts,tsconfig.json,components.json}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const CODEBASE: Record<string, string> = { ...rawSource, ...rawMigrations, ...rawRoot };

export interface FileEntry { path: string; lines: number; bytes: number }

export function fileIndex(): FileEntry[] {
  return Object.entries(CODEBASE)
    .map(([path, content]) => ({
      path: path.replace(/^\//, ""),
      lines: content.split("\n").length,
      bytes: content.length,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** Pick files most relevant to a question, within a byte budget. */
export function selectRelevantFiles(question: string, budgetBytes = 60_000): { path: string; content: string }[] {
  const q = question.toLowerCase();
  const tokens = Array.from(
    new Set(
      q
        .split(/[^a-z0-9_/.-]+/i)
        .filter((t) => t.length >= 3 && !STOPWORDS.has(t)),
    ),
  );

  const scored: { path: string; content: string; score: number }[] = [];
  for (const [rawPath, content] of Object.entries(CODEBASE)) {
    const path = rawPath.replace(/^\//, "");
    const lower = (path + "\n" + content).toLowerCase();
    let score = 0;
    for (const t of tokens) {
      // filename hits count much more than body hits
      if (path.toLowerCase().includes(t)) score += 20;
      const idx = lower.indexOf(t);
      if (idx !== -1) score += 1;
    }
    if (score > 0) scored.push({ path, content, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const picked: { path: string; content: string }[] = [];
  let used = 0;
  for (const f of scored) {
    const trimmed = f.content.length > 12_000 ? f.content.slice(0, 12_000) + "\n/* …truncated… */" : f.content;
    if (used + trimmed.length > budgetBytes) continue;
    picked.push({ path: f.path, content: trimmed });
    used += trimmed.length;
    if (picked.length >= 8) break;
  }
  return picked;
}

const STOPWORDS = new Set([
  "the","and","for","with","this","that","from","what","when","where","which","how","why","who","are","was","were",
  "have","has","had","not","but","you","your","our","its","it's","can","could","should","would","will","also",
  "into","onto","about","tell","show","give","list","find","need","want","please","use","using","make","made",
  "add","added","new","old","any","all","some","one","two","get","got","let","see","look","code","app","file",
  "files","admin","coordinator","brilliant","agent","system","real","time","data","info","information",
]);
