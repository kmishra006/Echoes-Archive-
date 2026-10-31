import { useEffect, useState } from "react";
import { CalendarDays, FileText, HardDrive, Pencil, Tag, Trash2, Users, X } from "lucide-react";
import { api, type Memory } from "../lib/api";
import { categoryTone, formatMemoryDate, relativeTime } from "../lib/format";
import { ErrorNote } from "./ui";

export default function MemoryDrawer({
  memory,
  onClose,
  onEdit,
  onDeleted,
}: {
  memory: Memory | null;
  onClose: () => void;
  onEdit: (memory: Memory) => void;
  onDeleted: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setConfirming(false);
    setError("");
  }, [memory?.id]);

  useEffect(() => {
    if (!memory) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [memory, onClose]);

  if (!memory) return null;
  const tone = categoryTone(memory.category);

  async function remove() {
    if (!memory) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteMemory(memory.id);
      onDeleted(memory.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this memory.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[65] flex justify-end">
      <button
        type="button"
        aria-label="Close memory"
        onClick={onClose}
        className="flex-1 bg-ink/75 backdrop-blur-sm"
      />
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-ink-line bg-ink-soft rise">
        <div className="flex items-start justify-between border-b border-ink-line px-6 py-5">
          <div>
            <span
              className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[9.5px] uppercase tracking-[0.16em] ${tone.border} ${tone.text}`}
            >
              <span className={`h-1 w-1 ${tone.dot}`} />
              {memory.category}
            </span>
            <h2 className="mt-3 text-[26px] leading-tight text-ivory">{memory.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="mt-1 text-muted transition-colors hover:text-ivory"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="scroll-slim flex-1 overflow-y-auto px-6 py-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.14em] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={12} strokeWidth={1.5} />
              {formatMemoryDate(memory.memory_date)}
            </span>
            <span>Recorded {relativeTime(memory.created_at)}</span>
            {memory.is_demo && <span className="text-gold/70">sample archive</span>}
          </div>

          <div className="my-6 h-px bg-ink-line" />

          <div className="memory-body text-[14.5px] text-dim">{memory.content}</div>

          {memory.people.length > 0 && (
            <div className="mt-8">
              <p className="label">People</p>
              <div className="flex flex-wrap gap-2">
                {memory.people.map((person) => (
                  <span
                    key={person}
                    className="inline-flex items-center gap-1.5 border border-ink-line px-2.5 py-1 text-[11px] text-dim"
                  >
                    <Users size={11} strokeWidth={1.5} className="text-gold/70" />
                    {person}
                  </span>
                ))}
              </div>
            </div>
          )}

          {memory.tags.length > 0 && (
            <div className="mt-6">
              <p className="label">Tags</p>
              <div className="flex flex-wrap gap-2">
                {memory.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.12em] text-muted"
                  >
                    <Tag size={10} strokeWidth={1.5} />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-ink-line pt-4">
            <p className="label">Source</p>
            <div className="space-y-1 text-[11.5px] text-muted">
              {memory.source?.type === "file" ? (
                <>
                  <p className="inline-flex items-center gap-1.5 text-dim">
                    <FileText size={12} strokeWidth={1.5} className="text-gold/70" />
                    {memory.source.filename}
                    {memory.source.kind === "pdf" && memory.source.pages
                      ? ` · ${memory.source.pages} page${memory.source.pages === 1 ? "" : "s"}`
                      : ""}
                  </p>
                  <p className="inline-flex items-center gap-1.5">
                    <HardDrive size={12} strokeWidth={1.5} />
                    Stored locally in the archive's uploads folder
                    {typeof memory.source.bytes === "number"
                      ? ` · ${(memory.source.bytes / 1024).toFixed(1)} KB`
                      : ""}
                  </p>
                </>
              ) : memory.source?.type === "demo" ? (
                <p>Fictional sample entry, written for the demo archive.</p>
              ) : (
                <p>Entered by hand in this archive.</p>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-5">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}
        </div>

        <div className="border-t border-ink-line px-6 py-4">
          {confirming ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11.5px] text-dim">Delete this memory permanently?</p>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost py-2" onClick={() => setConfirming(false)}>
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={remove}
                  disabled={busy}
                  className="btn border border-marigold/60 px-4 py-2 text-marigold hover:bg-marigold/10"
                >
                  {busy ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button type="button" className="btn-quiet" onClick={() => setConfirming(true)}>
                <Trash2 size={13} strokeWidth={1.5} />
                Delete
              </button>
              <button type="button" className="btn-ghost py-2.5" onClick={() => onEdit(memory)}>
                <Pencil size={13} strokeWidth={1.5} />
                Edit memory
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
