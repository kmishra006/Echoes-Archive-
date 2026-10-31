import { Quote } from "lucide-react";
import type { Source } from "../lib/api";
import { formatMemoryDate } from "../lib/format";

/**
 * The evidence list. Numbers here are the same numbers used inline in a generated
 * answer, so a citation in the text can always be traced to a stored memory.
 */
export default function SourceList({
  sources,
  cited,
  onOpen,
}: {
  sources: Source[];
  cited: number[];
  onOpen?: (memoryId: string) => void;
}) {
  if (sources.length === 0) {
    return (
      <p className="border border-dashed border-ink-line px-4 py-6 text-center text-[11.5px] leading-relaxed text-muted">
        No passages were retrieved, so there is nothing to cite.
      </p>
    );
  }

  return (
    <ol className="space-y-2.5">
      {sources.map((source) => {
        const isCited = cited.includes(source.index);
        return (
          <li key={`${source.memory_id}-${source.index}`}>
            <button
              type="button"
              onClick={() => onOpen?.(source.memory_id)}
              className={[
                "w-full border p-3.5 text-left transition-colors duration-300",
                isCited
                  ? "border-gold/40 bg-gold/[0.04]"
                  : "border-ink-line bg-ink-soft/40 hover:border-gold/25",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center border border-gold/40 px-1 text-[10px] text-gold">
                  {source.index}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-display text-[15px] leading-snug text-ivory">
                      {source.title}
                    </span>
                    {isCited && (
                      <span className="text-[8.5px] uppercase tracking-[0.16em] text-gold/80">
                        cited
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[9.5px] uppercase tracking-[0.14em] text-muted">
                    {source.category} · {formatMemoryDate(source.memory_date)}
                  </p>
                  <p className="mt-2 flex gap-1.5 text-[12px] leading-relaxed text-dim/85">
                    <Quote size={11} strokeWidth={1.5} className="mt-1 shrink-0 text-gold/40" />
                    <span>{source.excerpt}</span>
                  </p>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
