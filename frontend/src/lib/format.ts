/** Small formatting helpers shared by the archive screens. */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** memory_date can be YYYY, YYYY-MM or YYYY-MM-DD. Render only what is known. */
export function formatMemoryDate(value: string | null | undefined): string {
  if (!value) return "Undated";
  const parts = value.split("-");
  const [year, month, day] = parts;
  if (!year) return "Undated";
  if (parts.length === 1) return year;
  const monthName = MONTHS[Number(month) - 1];
  if (!monthName) return year;
  if (parts.length === 2) return `${monthName} ${year}`;
  return `${Number(day)} ${monthName} ${year}`;
}

export function yearOf(value: string | null | undefined): string {
  return value ? value.slice(0, 4) : "—";
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/** Categories are free text, so colour is derived rather than hardcoded. */
export function categoryTone(category: string): { text: string; border: string; dot: string } {
  const tones = [
    { text: "text-gold", border: "border-gold/35", dot: "bg-gold" },
    { text: "text-marigold", border: "border-marigold/35", dot: "bg-marigold" },
    { text: "text-parchment", border: "border-parchment/30", dot: "bg-parchment" },
    { text: "text-dim", border: "border-dim/25", dot: "bg-dim" },
  ];
  let hash = 0;
  for (const char of category) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return tones[hash % tones.length];
}

export const SUGGESTED_QUESTIONS = [
  "What was the special recipe in Grandma's memories?",
  "What stories do we have about our hometown?",
  "Who mentioned the old family house?",
  "What happened during the summer of 1998?",
  "Do we have any memories about Diwali celebrations?",
  "What did Papa say about leaving?",
];
