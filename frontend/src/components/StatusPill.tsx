import { useStatus } from "../lib/status";

/**
 * The status pill reports what is actually true right now: backend reachable,
 * Ollama reachable, model pulled. It never shows "AI ready" optimistically.
 */
export default function StatusPill() {
  const { status, error, loading } = useStatus();

  let tone = "bg-muted";
  let label = "Connecting";
  let title = "Contacting the archive server…";

  if (error) {
    tone = "bg-marigold";
    label = "Backend offline";
    title = error;
  } else if (status) {
    const { ai } = status;
    if (ai.available && ai.model_ready) {
      tone = "bg-gold";
      label = "Model ready";
      title = `${ai.provider} · ${ai.model} · local at ${ai.endpoint}`;
    } else if (ai.available) {
      tone = "bg-marigold";
      label = "Model not pulled";
      title = ai.detail;
    } else {
      tone = "bg-marigold";
      label = "Model offline";
      title = ai.detail;
    }
  } else if (!loading) {
    tone = "bg-marigold";
    label = "Unknown";
  }

  return (
    <span
      title={title}
      className="inline-flex cursor-default items-center gap-2 border border-ink-line px-2.5 py-1.5 text-[9.5px] uppercase tracking-[0.16em] text-dim"
    >
      <span className={`h-1.5 w-1.5 ${tone} ${label === "Connecting" ? "breathe" : ""}`} />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
