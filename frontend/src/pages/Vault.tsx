import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BookOpen, FileUp, Plus, Search, X } from "lucide-react";
import { api, type Memory } from "../lib/api";
import { useStatus } from "../lib/status";
import MemoryCard from "../components/MemoryCard";
import MemoryDrawer from "../components/MemoryDrawer";
import MemoryForm from "../components/MemoryForm";
import UploadDialog from "../components/UploadDialog";
import { EmptyState, ErrorNote, PageHeader } from "../components/ui";

export default function Vault() {
  const { refresh: refreshStatus } = useStatus();
  const [params, setParams] = useSearchParams();
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [openMemory, setOpenMemory] = useState<Memory | null>(null);

  const category = params.get("category") ?? "";
  const focusId = params.get("memory");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    try {
      const [list, stats] = await Promise.all([
        api.memories({ q: debounced || undefined, category: category || undefined }),
        api.stats(),
      ]);
      setMemories(list);
      setAllCategories(stats.categories.map((entry) => entry.name));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the vault.");
      setMemories([]);
    }
  }, [debounced, category]);

  useEffect(() => {
    void load();
  }, [load]);

  // Deep links: /vault?memory=<id> opens the entry, even if it is filtered out.
  useEffect(() => {
    if (!focusId) {
      setOpenMemory(null);
      return;
    }
    const found = memories?.find((entry) => entry.id === focusId);
    if (found) {
      setOpenMemory(found);
      return;
    }
    let cancelled = false;
    api
      .memory(focusId)
      .then((entry) => {
        if (!cancelled) setOpenMemory(entry);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [focusId, memories]);

  function selectCategory(next: string) {
    const updated = new URLSearchParams(params);
    if (next) updated.set("category", next);
    else updated.delete("category");
    updated.delete("memory");
    setParams(updated, { replace: true });
  }

  function openEntry(memory: Memory) {
    const updated = new URLSearchParams(params);
    updated.set("memory", memory.id);
    setParams(updated, { replace: true });
  }

  function closeEntry() {
    const updated = new URLSearchParams(params);
    updated.delete("memory");
    setParams(updated, { replace: true });
  }

  function afterWrite() {
    void load();
    void refreshStatus();
  }

  const hasAny = useMemo(() => (memories?.length ?? 0) > 0, [memories]);
  const filtering = Boolean(debounced || category);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Memory vault"
        title="The entries themselves"
        description="Every card is a row in the local database. Open one to read it in full, edit it, or remove it."
        actions={
          <>
            <button type="button" className="btn-ghost" onClick={() => setImporting(true)}>
              <FileUp size={13} strokeWidth={1.75} />
              Import
            </button>
            <button type="button" className="btn-gold" onClick={() => setAdding(true)}>
              <Plus size={14} strokeWidth={1.75} />
              Add memory
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search
            size={14}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles, content, people and tags…"
            className="field pl-10 pr-10"
            aria-label="Search memories"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ivory"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {allCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => selectCategory("")}
              className={[
                "border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition-colors",
                category === ""
                  ? "border-gold/50 text-gold"
                  : "border-ink-line text-muted hover:text-ivory",
              ].join(" ")}
            >
              All
            </button>
            {allCategories.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => selectCategory(name === category ? "" : name)}
                className={[
                  "border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition-colors",
                  name === category
                    ? "border-gold/50 text-gold"
                    : "border-ink-line text-muted hover:text-ivory",
                ].join(" ")}
              >
                {name}
              </button>
            ))}
            <span className="ml-auto text-[10px] uppercase tracking-[0.16em] text-muted">
              {memories === null ? "reading…" : `${memories.length} shown`}
            </span>
          </div>
        )}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {memories === null ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="panel h-[210px] animate-pulse bg-ink-soft/60" />
          ))}
        </div>
      ) : memories.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={26} strokeWidth={1.25} />}
          title={filtering || hasAny ? "Nothing matches that" : "No memories yet"}
          body={
            filtering
              ? "Try a broader search, or clear the category filter. The archive only answers from what has actually been recorded."
              : "Add the first entry, or import a text file. ECHOES keeps the original file and the extracted text."
          }
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" className="btn-gold" onClick={() => setAdding(true)}>
                <Plus size={14} strokeWidth={1.75} />
                Add memory
              </button>
              {filtering && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setQuery("");
                    selectCategory("");
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {memories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} onOpen={openEntry} />
          ))}
        </div>
      )}

      <MemoryDrawer
        memory={openMemory}
        onClose={closeEntry}
        onEdit={(memory) => {
          closeEntry();
          setEditing(memory);
        }}
        onDeleted={() => afterWrite()}
      />

      <MemoryForm
        open={adding || Boolean(editing)}
        initial={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        onSaved={() => afterWrite()}
      />

      <UploadDialog open={importing} onClose={() => setImporting(false)} onSaved={() => afterWrite()} />
    </div>
  );
}
