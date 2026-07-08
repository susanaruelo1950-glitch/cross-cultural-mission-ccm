import { useMemo } from "react";
import { BookOpen } from "lucide-react";

/** Rotating Scripture of the Day — deterministic per day (no re-shuffle on re-render). */
const VERSES: { ref: string; text: string }[] = [
  { ref: "Matthew 28:19", text: "Therefore go and make disciples of all nations." },
  { ref: "Romans 10:15", text: "How beautiful are the feet of those who bring good news!" },
  { ref: "Isaiah 6:8", text: "Here am I. Send me!" },
  { ref: "Acts 1:8", text: "You will be my witnesses… to the ends of the earth." },
  { ref: "Mark 16:15", text: "Go into all the world and preach the gospel to all creation." },
  { ref: "Psalm 96:3", text: "Declare his glory among the nations, his marvelous deeds among all peoples." },
  { ref: "Matthew 9:37-38", text: "The harvest is plentiful but the workers are few." },
  { ref: "Romans 1:16", text: "I am not ashamed of the gospel — it is the power of God for salvation." },
  { ref: "1 Corinthians 15:58", text: "Your labor in the Lord is not in vain." },
  { ref: "Isaiah 52:7", text: "How beautiful on the mountains are the feet of those who bring good news." },
  { ref: "John 4:35", text: "Look at the fields! They are ripe for harvest." },
  { ref: "Philippians 4:13", text: "I can do all this through him who gives me strength." },
  { ref: "Joshua 1:9", text: "Be strong and courageous. Do not be afraid; the LORD your God is with you." },
  { ref: "2 Timothy 4:2", text: "Preach the word; be prepared in season and out of season." },
  { ref: "Colossians 3:23", text: "Whatever you do, work at it with all your heart, as working for the Lord." },
  { ref: "Psalm 67:2", text: "That your ways may be known on earth, your salvation among all nations." },
  { ref: "Habakkuk 2:14", text: "The earth will be filled with the knowledge of the glory of the LORD." },
  { ref: "Revelation 7:9", text: "A great multitude… from every nation, tribe, people and language." },
  { ref: "Luke 10:2", text: "Ask the Lord of the harvest to send out workers into his harvest field." },
  { ref: "1 Peter 3:15", text: "Always be prepared to give an answer for the hope that you have." },
  { ref: "Ephesians 6:19", text: "Pray… that words may be given me so that I will fearlessly make known the mystery of the gospel." },
  { ref: "Matthew 5:16", text: "Let your light shine before others." },
  { ref: "Proverbs 3:5-6", text: "Trust in the LORD with all your heart." },
  { ref: "Romans 15:20", text: "It has always been my ambition to preach the gospel where Christ was not known." },
  { ref: "2 Corinthians 5:20", text: "We are therefore Christ's ambassadors." },
  { ref: "Galatians 6:9", text: "Let us not become weary in doing good." },
  { ref: "Psalm 46:10", text: "Be still, and know that I am God; I will be exalted among the nations." },
  { ref: "John 15:16", text: "I chose you and appointed you so that you might go and bear fruit — fruit that will last." },
  { ref: "Isaiah 43:19", text: "See, I am doing a new thing! Now it springs up; do you not perceive it?" },
  { ref: "Matthew 16:18", text: "I will build my church, and the gates of Hades will not overcome it." },
  { ref: "Lamentations 3:22-23", text: "His compassions never fail. They are new every morning." },
];

function dayOfYear(d: Date) {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86400000);
}

export function ScriptureOfTheDay({ compact = false }: { compact?: boolean }) {
  const verse = useMemo(() => VERSES[dayOfYear(new Date()) % VERSES.length], []);
  if (compact) {
    return (
      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <span className="truncate italic">"{verse.text}"</span>
        <span className="shrink-0 text-[10px] uppercase tracking-wide">— {verse.ref}</span>
      </div>
    );
  }
  return (
    <div
      role="region"
      aria-label="Scripture of the day"
      className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-3 sm:p-4"
    >
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <BookOpen className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Scripture of the Day
        </div>
        <blockquote className="mt-0.5 font-display text-sm italic text-foreground/90 sm:text-base">
          "{verse.text}"
        </blockquote>
        <div className="mt-1 text-xs font-medium text-muted-foreground">— {verse.ref}</div>
      </div>
    </div>
  );
}
