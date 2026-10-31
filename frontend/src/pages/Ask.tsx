import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, CircleAlert, Quote, RotateCcw, SearchX, Sparkles, Terminal } from "lucide-react";
import { api, type AskResponse, type ChatMessage } from "../lib/api";
import { useStatus } from "../lib/status";
import { SUGGESTED_QUESTIONS } from "../lib/format";
import SourceList from "../components/SourceList";
import { ErrorNote, PageHeader } from "../components/ui";

/** Answers carry inline [n] markers; render them as the citation chips used in the evidence list. */
function AnswerText({ text }: { text: string }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <p className="memory-body text-[14px] leading-[1.75] text-dim">
      {parts.map((part, index) => {
        const match = /^\[(\d+)\]$/.exec(part);
        if (match) {
          return (
            <span key={index} className="cite">
              {match[1]}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
}

function StatusBadge({ status }: { status?: AskResponse["status"] }) {
  if (!status) return null;
  const map = {
    answered: { label: "grounded answer", className: "border-gold/40 text-gold" },
    not_found: { label: "not in the archive", className: "border-marigold/50 text-marigold" },
    model_unavailable: { label: "model offline", className: "border-marigold/50 text-marigold" },
    model_error: { label: "model error", className: "border-marigold/50 text-marigold" },
  } as const;
  const entry = map[status];
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 text-[8.5px] uppercase tracking-[0.16em] ${entry.className}`}
    >
      {entry.label}
    </span>
  );
}

export default function Ask() {
  const { status, refresh: refreshStatus } = useStatus();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const current = (lastAssistant?.meta ?? null) as AskResponse | null;
  const ai = status?.ai;
  const modelReady = Boolean(ai?.available && ai.model_ready);

  const load = useCallback(async () => {
    try {
      setMessages(await api.conversation());
    } catch {
      /* An unreachable backend is surfaced by the status pill and the composer. */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  async function submit(text: string) {
    const question = text.trim();
    if (!question || sending) return;
    setSending(true);
    setError("");
    setInput("");
    const stamp = Date.now();
    setMessages((previous) => [
      ...previous,
      { id: `local-${stamp}`, role: "user", content: question, meta: {}, created_at: new Date().toISOString() },
    ]);
    try {
      const response = await api.ask(question);
      setMessages((previous) => [
        ...previous,
        {
          id: `local-a-${stamp}`,
          role: "assistant",
          content: response.answer,
          meta: response,
          created_at: new Date().toISOString(),
        },
      ]);
      void refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The archive could not answer that.");
    } finally {
      setSending(false);
    }
  }

  async function reset() {
    try {
      await api.clearConversation();
      setMessages([]);
    } catch {
      /* leave the transcript in place if the server refuses */
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Ask Echoes"
        title="Questions answered from the archive only"
        description="Your question is matched against passages stored on this machine. Those passages are the only thing the model is allowed to read."
        actions={
          messages.length > 0 ? (
            <button type="button" className="btn-quiet" onClick={() => void reset()}>
              <RotateCcw size={12} strokeWidth={1.75} />
              Clear conversation
            </button>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        {/* Conversation */}
        <section className="panel flex min-h-[560px] flex-col">
          <div className="flex items-center justify-between border-b border-ink-line px-5 py-3">
            <span className="text-[9.5px] uppercase tracking-[0.2em] text-muted">Conversation</span>
            <span className="inline-flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.14em] text-muted">
              <span className={`h-1.5 w-1.5 ${modelReady ? "bg-gold" : "bg-marigold"}`} />
              {modelReady ? `${ai?.model} · local` : "local model offline"}
            </span>
          </div>

          <div className="scroll-slim flex-1 space-y-6 overflow-y-auto px-5 py-6">
            {loading ? (
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Reading the transcript…</p>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col justify-center py-6">
                <Sparkles size={20} strokeWidth={1.25} className="text-gold/70" />
                <h2 className="mt-4 font-display text-[26px] leading-tight text-ivory">
                  Ask about the people in these memories.
                </h2>
                <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted">
                  ECHOES searches every stored passage, then hands only the strongest matches to the
                  local model. If nothing supports an answer, it says so rather than guessing.
                </p>
                <div className="mt-6 space-y-2">
                  {SUGGESTED_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void submit(question)}
                      className="group flex w-full items-center justify-between border border-ink-line px-3.5 py-2.5 text-left text-[12.5px] text-dim transition-colors hover:border-gold/40 hover:text-ivory"
                    >
                      {question}
                      <ArrowUp
                        size={12}
                        strokeWidth={1.75}
                        className="rotate-45 text-muted transition-colors group-hover:text-gold"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%] border border-ink-line bg-ink px-4 py-3">
                      <p className="text-[13.5px] leading-relaxed text-ivory">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="border-l border-gold/30 pl-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="font-display text-[10px] uppercase tracking-[0.24em] text-gold">
                        Echoes
                      </span>
                      <StatusBadge status={(message.meta as AskResponse | undefined)?.status} />
                    </div>
                    <AnswerText text={message.content} />
                    {(message.meta as AskResponse | undefined)?.sources?.length ? (
                      <p className="mt-3 text-[10.5px] text-muted">
                        {(message.meta as AskResponse).sources.length} passage
                        {(message.meta as AskResponse).sources.length === 1 ? "" : "s"} retrieved
                        {(message.meta as AskResponse).cited.length > 0
                          ? ` · ${(message.meta as AskResponse).cited.length} cited`
                          : " · none cited"}
                      </p>
                    ) : null}
                  </div>
                ),
              )
            )}

            {sending && (
              <div className="border-l border-gold/30 pl-4">
                <span className="font-display text-[10px] uppercase tracking-[0.24em] text-gold">
                  Echoes
                </span>
                <p className="mt-2 flex items-center gap-2 text-[11.5px] text-muted">
                  <span className="h-1.5 w-1.5 animate-pulse bg-gold" />
                  Searching the archive…
                </p>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {error && (
            <div className="px-5 pb-3">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit(input);
            }}
            className="border-t border-ink-line p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submit(input);
                  }
                }}
                rows={2}
                placeholder="What do we remember about…"
                aria-label="Ask Echoes a question"
                className="field max-h-40 min-h-[52px] flex-1 resize-none leading-relaxed"
              />
              <button
                type="submit"
                className="btn-gold h-[52px] px-4"
                disabled={sending || !input.trim()}
                aria-label="Send question"
              >
                <ArrowUp size={16} strokeWidth={1.75} />
              </button>
            </div>
            <p className="mt-2 px-1 text-[10px] text-muted">
              Enter to send · Shift+Enter for a new line · answers come only from stored memories
            </p>
          </form>
        </section>

        {/* Evidence */}
        <aside className="space-y-4">
          {!modelReady && (
            <section className="border border-marigold/35 bg-marigold/[0.05] p-5">
              <div className="flex items-center gap-2 text-marigold">
                <CircleAlert size={15} strokeWidth={1.5} />
                <h2 className="text-[10px] uppercase tracking-[0.2em]">Local model not running</h2>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-dim">
                {ai?.detail ||
                  "Ollama is not reachable, so no answer can be generated. ECHOES will still retrieve evidence and show it to you unedited."}
              </p>
              <div className="mt-4 space-y-1.5 font-mono text-[11px] text-muted">
                <p className="inline-flex items-center gap-2">
                  <Terminal size={11} strokeWidth={1.5} />
                  ollama serve
                </p>
                <p className="pl-[19px]">ollama pull {ai?.model ?? "qwen2.5:3b"}</p>
              </div>
            </section>
          )}

          <section className="panel">
            <div className="flex items-center justify-between border-b border-ink-line px-4 py-3">
              <h2 className="text-[9.5px] uppercase tracking-[0.2em] text-muted">Retrieved evidence</h2>
              {current && (
                <span className="text-[9.5px] uppercase tracking-[0.14em] text-muted">
                  {current.sources.length} passage{current.sources.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="p-4">
              {current ? (
                <SourceList
                  sources={current.sources}
                  cited={current.cited}
                  onOpen={(id) => {
                    window.location.href = `/vault?memory=${id}`;
                  }}
                />
              ) : (
                <div className="py-6 text-center">
                  <SearchX size={20} strokeWidth={1.25} className="mx-auto text-muted/70" />
                  <p className="mt-3 text-[12px] leading-relaxed text-muted">
                    Ask a question and the passages used for the answer will appear here, numbered
                    to match the citations.
                  </p>
                </div>
              )}
            </div>
          </section>

          {current && (
            <section className="panel">
              <div className="border-b border-ink-line px-4 py-3">
                <h2 className="text-[9.5px] uppercase tracking-[0.2em] text-muted">
                  How this was produced
                </h2>
              </div>
              <dl className="space-y-3 p-4 text-[11.5px]">
                <div>
                  <dt className="text-[9.5px] uppercase tracking-[0.16em] text-muted">Search terms</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {current.diagnostics.query_terms.map((term) => (
                      <span key={term} className="border border-ink-line px-1.5 py-0.5 text-[10.5px] text-dim">
                        {term}
                      </span>
                    ))}
                    {current.diagnostics.query_terms.length === 0 && (
                      <span className="text-muted">—</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Passages indexed</dt>
                  <dd className="tabular-nums text-dim">{current.diagnostics.passages_indexed}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Passages returned</dt>
                  <dd className="tabular-nums text-dim">{current.diagnostics.hits}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Model</dt>
                  <dd className="text-dim">
                    {current.model.provider} · {current.model.name}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Generation time</dt>
                  <dd className="tabular-nums text-dim">
                    {current.model.latency_ms > 0 ? `${(current.model.latency_ms / 1000).toFixed(1)}s` : "—"}
                  </dd>
                </div>
                {current.message && (
                  <div className="border-t border-ink-line pt-3">
                    <dt className="text-[9.5px] uppercase tracking-[0.16em] text-muted">Note</dt>
                    <dd className="mt-1 leading-relaxed text-dim/85">{current.message}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          <p className="flex gap-2 px-1 text-[10.5px] leading-relaxed text-muted">
            <Quote size={12} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold/40" />
            <span>
              Citations point at real rows in{" "}
              <Link to="/vault" className="text-dim underline decoration-ink-line underline-offset-4 hover:text-gold">
                the vault
              </Link>
              . The model is instructed to refuse rather than invent when evidence is missing.
            </span>
          </p>
        </aside>
      </div>
    </div>
  );
}
