import { CalendarDays, FileText, Users } from "lucide-react";
import type { Memory } from "../lib/api";
import { categoryTone, formatMemoryDate, relativeTime } from "../lib/format";

export default function MemoryCard({
  memory,
  onOpen,
  compact = false,
}: {
  memory: Memory;
  onOpen?: (memory: Memory) => void;
  compact?: boolean;
}) {
  const tone = categoryTone(memory.category);
  const isClickable = Boolean(onOpen);
  const excerpt = memory.content.length > (compact ? 120 : 190)
    ? `${memory.content.slice(0, compact ? 120 : 190).trimEnd()}…`
    : memory.content;

  return (
    <article
      onClick={() => onOpen?.(memory)}
      className={[
        "panel group relative flex h-full flex-col p-5",
        isClickable
          ? "panel-hover cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-30px_rgba(0,0,0,0.9)] transition-transform duration-300"
          : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[9.5px] uppercase tracking-[0.16em] ${tone.border} ${tone.text}`}
        >
          <span className={`h-1 w-1 ${tone.dot}`} />
          {memory.category}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted">
          <CalendarDays size={11} strokeWidth={1.5} />
          {formatMemoryDate(memory.memory_date)}
        </span>
      </div>

      <h3 className="mt-4 font-display text-[21px] leading-snug text-ivory transition-colors group-hover:text-gold-bright">
        {memory.title}
      </h3>

      <p className="mt-2.5 flex-1 text-[13px] leading-relaxed text-dim/90">{excerpt}</p>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink-line/80 pt-3 text-[10px] uppercase tracking-[0.12em] text-muted">
        {memory.people.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Users size={11} strokeWidth={1.5} />
            {memory.people.slice(0, 2).join(", ")}
            {memory.people.length > 2 && ` +${memory.people.length - 2}`}
          </span>
        )}
        {memory.source?.type === "file" && (
          <span className="inline-flex items-center gap-1.5">
            <FileText size={11} strokeWidth={1.5} />
            {memory.source.kind === "pdf" ? "PDF" : "Text file"}
          </span>
        )}
        <span className="ml-auto normal-case tracking-normal">{relativeTime(memory.created_at)}</span>
      </div>

      {memory.is_demo && (
        <span className="absolute -top-px right-4 bg-ink px-1.5 text-[8.5px] uppercase tracking-[0.18em] text-muted">
          demo
        </span>
      )}
    </article>
  );
}
