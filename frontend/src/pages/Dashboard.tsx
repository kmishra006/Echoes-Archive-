import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Cpu,
  Database,
  FileUp,
  MessageSquare,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { api, type Memory, type Stats } from "../lib/api";
import { useStatus } from "../lib/status";
import { categoryTone } from "../lib/format";
import { EmptyState, ErrorNote, PageHeader, Spinner } from "../components/ui";
import MemoryCard from "../components/MemoryCard";
import MemoryForm from "../components/MemoryForm";
import UploadDialog from "../components/UploadDialog";

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="panel flex flex-col justify-between p-5">
      <div className="flex items-center justify-between text-muted">
        <span className="text-[9.5px] uppercase tracking-[0.2em]">{label}</span>
        {icon}
      </div>
      <p className="mt-6 font-display text-[34px] leading-none text-ivory">{value}</p>
      {hint && <p className="mt-2 text-[10.5px] text-muted">{hint}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { status, refresh: refreshStatus } = useStatus();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStats(await api.stats());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the archive.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function afterWrite() {
    void load();
    void refreshStatus();
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  const ai = status?.ai;
  const modelReady = Boolean(ai?.available && ai.model_ready);
  const demoOnly = Boolean(stats && stats.total_memories > 0 && stats.demo_memories === stats.total_memories);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="The archive"
        title="Everything you have chosen to keep"
        description="A private record of stories, recipes, letters and dates. Ask questions of it whenever you like — the answers are drawn from these entries and nowhere else."
        actions={
          <>
            <button type="button" className="btn-ghost" onClick={() => setImporting(true)}>
              <FileUp size={13} strokeWidth={1.75} />
              Import file
            </button>
            <button type="button" className="btn-gold" onClick={() => setAdding(true)}>
              <Plus size={14} strokeWidth={1.75} />
              Quick add
            </button>
          </>
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={<Database size={15} strokeWidth={1.5} />}
          label="Memories"
          value={stats?.total_memories ?? "—"}
          hint={stats?.demo_memories ? `${stats.demo_memories} in the sample archive` : "Stored in SQLite"}
        />
        <StatTile
          icon={<Users size={15} strokeWidth={1.5} />}
          label="People"
          value={stats?.people_count ?? "—"}
          hint={stats?.people.slice(0, 2).join(" · ") || "Named in your memories"}
        />
        <StatTile
          icon={<FileUp size={15} strokeWidth={1.5} />}
          label="Imported files"
          value={stats?.upload_count ?? "—"}
          hint="TXT and PDF, stored locally"
        />
        <StatTile
          icon={<Cpu size={15} strokeWidth={1.5} />}
          label="Local model"
          value={modelReady ? "Ready" : "Offline"}
          hint={ai ? `${ai.provider} · ${ai.model}` : "Checking…"}
        />
      </div>

      {demoOnly && (
        <div className="flex flex-col gap-3 border border-gold/25 bg-gold/[0.04] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] leading-relaxed text-dim">
            <span className="text-gold">You are looking at the sample archive.</span> Twelve
            fictional entries about the Mehta family, written for the demo. Add your own memories
            whenever you are ready — or clear the samples.
          </p>
          <button
            type="button"
            className="btn-quiet shrink-0"
            onClick={async () => {
              await api.clearDemo();
              afterWrite();
            }}
          >
            Clear sample archive
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <div className="flex items-baseline justify-between border-b border-ink-line pb-3">
            <h2 className="text-[19px] text-ivory">Recently added</h2>
            <Link to="/vault" className="btn-quiet">
              Open vault
              <ArrowRight size={12} strokeWidth={1.75} />
            </Link>
          </div>

          {!stats ? (
            <div className="py-8">
              <Spinner label="Reading the archive" />
            </div>
          ) : stats.recent.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={<BookOpen size={26} strokeWidth={1.25} />}
                title="The archive is empty"
                body="Nothing has been kept yet. Start with one story, or load the fictional sample archive to see how ECHOES behaves."
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <button type="button" className="btn-gold" onClick={() => setAdding(true)}>
                      <Plus size={14} strokeWidth={1.75} />
                      Add the first memory
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={async () => {
                        await api.seedDemo();
                        afterWrite();
                      }}
                    >
                      Load sample archive
                    </button>
                  </div>
                }
              />
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {stats.recent.slice(0, 4).map((memory) => (
                <Link key={memory.id} to={`/vault?memory=${memory.id}`} className="block">
                  <MemoryCard memory={memory} compact />
                </Link>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-y border-ink-line py-4">
            <Link to="/ask" className="btn-gold">
              <MessageSquare size={14} strokeWidth={1.75} />
              Ask Echoes
            </Link>
            <p className="text-[11px] leading-relaxed text-muted">
              {modelReady
                ? "Answers are written locally from retrieved passages, with citations."
                : "The local model is offline — Ask Echoes will show the evidence it finds instead of writing an answer."}
            </p>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="panel p-5">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted">Categories</h2>
            {stats && stats.categories.length > 0 ? (
              <ul className="mt-4 space-y-2.5">
                {stats.categories.map((category) => {
                  const tone = categoryTone(category.name);
                  return (
                    <li key={category.name}>
                      <Link
                        to={`/vault?category=${encodeURIComponent(category.name)}`}
                        className="group flex items-center justify-between text-[12.5px]"
                      >
                        <span className="inline-flex items-center gap-2 text-dim transition-colors group-hover:text-ivory">
                          <span className={`h-1 w-1 ${tone.dot}`} />
                          {category.name}
                        </span>
                        <span className="text-[10.5px] tabular-nums text-muted">
                          {category.count}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-[12px] text-muted">Nothing filed yet.</p>
            )}
          </section>

          <section className="panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted">Local inference</h2>
              <button
                type="button"
                onClick={() => void refreshStatus()}
                className="text-muted transition-colors hover:text-gold"
                aria-label="Refresh model status"
              >
                <RefreshCw size={13} strokeWidth={1.5} />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 ${modelReady ? "bg-gold" : "bg-marigold"}`}
                aria-hidden
              />
              <p className="text-[12.5px] text-ivory">
                {modelReady
                  ? `${ai?.model} is ready`
                  : ai?.available
                    ? "Ollama running, model missing"
                    : "Ollama is not running"}
              </p>
            </div>

            <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
              {ai?.detail || "Checking the local inference server…"}
            </p>

            {!modelReady && (
              <>
                <div className="mt-4 space-y-2">
                  {[`ollama serve`, `ollama pull ${ai?.model ?? "qwen2.5:3b"}`].map((command) => (
                    <button
                      key={command}
                      type="button"
                      onClick={() => void copy(command)}
                      className="flex w-full items-center justify-between border border-ink-line bg-ink px-3 py-2 text-left font-mono text-[11px] text-dim transition-colors hover:border-gold/40"
                    >
                      <span>{command}</span>
                      <span className="text-[9px] uppercase tracking-[0.14em] text-muted">
                        {copied === command ? "copied" : "copy"}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-muted">
                  Endpoint {ai?.endpoint}. Set OLLAMA_MODEL on the backend to use a different
                  open-weight model.
                </p>
              </>
            )}
          </section>
        </aside>
      </div>

      <MemoryForm
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={(memory: Memory) => {
          afterWrite();
          void memory;
        }}
      />
      <UploadDialog
        open={importing}
        onClose={() => setImporting(false)}
        onSaved={() => afterWrite()}
      />
    </div>
  );
}
