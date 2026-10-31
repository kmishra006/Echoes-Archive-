import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import { api, type Memory, type TimelineEntry } from "../lib/api";
import { categoryTone, formatMemoryDate } from "../lib/format";
import { EmptyState, ErrorNote, PageHeader } from "../components/ui";

export default function Remembrance() {
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);

  const load = useCallback(async () => {
    try {
      const [list, entries] = await Promise.all([api.memories(), api.timeline()]);
      setMemories(list);
      setTimeline(entries);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the remembrance room.");
      setMemories([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dated = useMemo(() => (memories ?? []).filter((memory) => memory.memory_date), [memories]);

  // The featured entry is stable for a given day, so the room feels like a calendar
  // rather than a slot machine; "another memory" moves it deliberately.
  const featured = useMemo(() => {
    if (dated.length === 0) return null;
    const dayIndex = Math.floor(Date.now() / 86_400_000) + offset;
    return dated[dayIndex % dated.length];
  }, [dated, offset]);

  const groups = useMemo(() => {
    const map = new Map<string, TimelineEntry[]>();
    for (const entry of timeline) {
      const decade = `${entry.year.slice(0, 3)}0s`;
      const bucket = map.get(decade) ?? [];
      bucket.push(entry);
      map.set(decade, bucket);
    }
    return [...map.entries()];
  }, [timeline]);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Remembrance room"
        title="One memory at a time"
        description="Nothing to search, nothing to ask. A single entry from the archive, and the order the years arrived in."
        actions={
          featured ? (
            <button type="button" className="btn-ghost" onClick={() => setOffset((value) => value + 1)}>
              <RefreshCw size={13} strokeWidth={1.75} />
              Another memory
            </button>
          ) : undefined
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      {memories !== null && memories.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={26} strokeWidth={1.25} />}
          title="The room is empty"
          body="There is nothing to sit with yet. Add a memory or load the sample archive from the dashboard."
          action={
            <Link to="/archive" className="btn-gold">
              Go to the archive
              <ArrowRight size={13} strokeWidth={1.75} />
            </Link>
          }
        />
      ) : featured ? (
        <section className="relative overflow-hidden border border-ink-line bg-ink-soft/70 px-6 py-14 sm:px-14 sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-[320px] w-[620px] -translate-x-1/2 rounded-full opacity-60 blur-[110px]"
            style={{ background: "radial-gradient(closest-side, rgba(200,162,92,0.13), transparent)" }}
          />
          <div className="relative mx-auto max-w-2xl text-center">
            <p className="eyebrow">Memory of the day</p>
            <h2 className="mt-4 font-display text-[26px] leading-tight text-ivory sm:text-[34px]">
              {featured.title}
            </h2>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[9.5px] uppercase tracking-[0.18em] text-muted">
              <span className={categoryTone(featured.category).text}>{featured.category}</span>
              <span className="h-px w-6 bg-ink-line" />
              <span>{formatMemoryDate(featured.memory_date)}</span>
            </div>

            <div className="my-8 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

            <p className="serif-quote text-[17px] leading-[1.85] text-parchment/90 sm:text-[19px]">
              {featured.content}
            </p>

            {featured.people.length > 0 && (
              <p className="mt-8 text-[10px] uppercase tracking-[0.2em] text-muted">
                {featured.people.join(" · ")}
              </p>
            )}

            <Link
              to={`/vault?memory=${featured.id}`}
              className="btn-quiet mt-8 justify-center"
            >
              Open this memory
              <ArrowRight size={12} strokeWidth={1.75} />
            </Link>
          </div>
        </section>
      ) : memories !== null ? (
        <EmptyState
          icon={<Sparkles size={26} strokeWidth={1.25} />}
          title="No dated memories yet"
          body="The remembrance room draws from entries with a date. Add one to a memory and it will appear here."
        />
      ) : null}

      {groups.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between border-b border-ink-line pb-3">
            <h2 className="text-[19px] text-ivory">The archive in order</h2>
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted">
              {timeline.length} dated entries
            </span>
          </div>

          <div className="mt-8 space-y-10">
            {groups.map(([decade, entries]) => (
              <div key={decade} className="grid gap-4 sm:grid-cols-[110px_1fr]">
                <div className="sm:sticky sm:top-24 sm:self-start">
                  <p className="font-display text-[26px] text-gold/80">{decade}</p>
                  <p className="text-[9.5px] uppercase tracking-[0.16em] text-muted">
                    {entries.length} entr{entries.length === 1 ? "y" : "ies"}
                  </p>
                </div>

                <ol className="relative border-l border-ink-line pl-6">
                  {entries.map((entry) => (
                    <li key={entry.id} className="relative pb-7 last:pb-0">
                      <span className="absolute -left-[29px] top-2 h-1.5 w-1.5 bg-gold/60" />
                      <Link to={`/vault?memory=${entry.id}`} className="group block">
                        <div className="flex flex-wrap items-baseline gap-x-3">
                          <span className="font-display text-[12px] tracking-[0.16em] text-muted">
                            {entry.year}
                          </span>
                          <span className="font-display text-[19px] text-ivory transition-colors group-hover:text-gold-bright">
                            {entry.title}
                          </span>
                        </div>
                        <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted">
                          {entry.excerpt}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
