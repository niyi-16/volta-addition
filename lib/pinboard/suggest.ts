import type { Topic } from "./types";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countHits(text: string, keyword: string): number {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return 0;
  // Whole-word match that still works for keywords like "sr&ed".
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(kw)}(?![\\p{L}\\p{N}])`, "gu");
  return text.match(re)?.length ?? 0;
}

/**
 * F6: top 3 topics by keyword hits, ties broken by label. Case-insensitive,
 * whole-word. No hits → empty array and the founder picks manually.
 */
export function suggestTopics(text: string, topics: Topic[]): Topic[] {
  const lower = text.toLowerCase();
  return topics
    .filter((t) => !t.hidden && !t.mergedInto)
    .map((t) => ({
      topic: t,
      hits: t.keywords.reduce((sum, kw) => sum + countHits(lower, kw), 0),
    }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.topic.label.localeCompare(b.topic.label))
    .slice(0, 3)
    .map((x) => x.topic);
}
