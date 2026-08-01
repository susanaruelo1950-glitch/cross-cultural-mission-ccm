// Lightweight live-news grounding for Grace. Pulls current headlines from
// Google News RSS (no API key needed) so answers about world events, science,
// technology, economics, politics and society can cite up-to-date reporting.

export interface NewsItem {
  title: string;
  source: string;
  published: string;
  link: string;
}

const CURRENT_EVENT_HINTS = [
  "news", "latest", "today", "yesterday", "this week", "this month", "this year",
  "current", "currently", "recent", "recently", "now", "update", "updates",
  "happening", "event", "events", "war", "conflict", "election", "elections",
  "president", "pope", "vatican", "economy", "inflation", "market", "markets",
  "stocks", "ai ", "technology", "breakthrough", "discovery", "earthquake",
  "typhoon", "storm", "disaster", "persecution", "government", "senate",
  "congress", "policy", "law", "ruling", "court", "peso", "prices", "oil",
  "crisis", "protest", "summit", "treaty", "sanction", "outbreak", "pandemic",
  "2025", "2026", "2027",
];

/** Heuristic: does this question likely need real-world, up-to-date info? */
export function needsLiveNews(question: string): boolean {
  const q = question.toLowerCase();
  return CURRENT_EVENT_HINTS.some((h) => q.includes(h));
}

function stripTags(s: string): string {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/** Turn a free-form question into a compact news search query. */
export function newsQuery(question: string): string {
  const stop = new Set([
    "what", "whats", "what's", "who", "when", "where", "why", "how", "is", "are",
    "was", "were", "the", "a", "an", "of", "in", "on", "to", "for", "and", "or",
    "about", "tell", "me", "please", "can", "you", "do", "does", "did", "any",
    "latest", "news", "today", "current", "currently", "recent", "recently",
    "happening", "world", "global", "give", "explain", "your", "my", "there",
  ]);
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w));
  const q = words.slice(0, 8).join(" ").trim();
  return q || "world news";
}

async function fetchFeed(url: string, limit: number): Promise<NewsItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CCM-Grace/1.0)" },
  });
  if (!res.ok) return [];
  const xml = await res.text();
  const items = xml.split("<item>").slice(1, limit + 1);
  return items.map((raw) => ({
    title: stripTags(raw.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
    source: stripTags(raw.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? ""),
    published: stripTags(raw.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? ""),
    link: stripTags(raw.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? ""),
  })).filter((i) => i.title);
}

/**
 * Topic headlines plus a small slice of general world headlines, so Grace
 * always has some current-affairs footing. Failures degrade to [].
 */
export async function fetchLiveNews(question: string, limit = 10): Promise<NewsItem[]> {
  const q = encodeURIComponent(newsQuery(question));
  const base = "https://news.google.com/rss";
  try {
    const [topic, world] = await Promise.all([
      fetchFeed(`${base}/search?q=${q}+when:14d&hl=en-US&gl=US&ceid=US:en`, limit),
      fetchFeed(`${base}?hl=en-US&gl=US&ceid=US:en`, 5),
    ]);
    const seen = new Set<string>();
    return [...topic, ...world].filter((i) => {
      const k = i.title.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, limit + 5);
  } catch (err) {
    console.warn("live news fetch failed", err);
    return [];
  }
}
