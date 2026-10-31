import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BookMarked, Quote, ScanSearch, Sparkles } from "lucide-react";
import { useStatus } from "../lib/status";

const PILLARS = [
  {
    icon: BookMarked,
    step: "01",
    title: "Record",
    body: "Stories, recipes, letters and photographs are written down or imported from a file. Everything is stored in a SQLite database and an uploads folder on this machine.",
  },
  {
    icon: ScanSearch,
    step: "02",
    title: "Retrieve",
    body: "A local BM25 index ranks the passages in your archive against the question you actually asked. No vectors leave the disk, because there is no server to send them to.",
  },
  {
    icon: Sparkles,
    step: "03",
    title: "Answer",
    body: "When Ollama is running, an open-weight model reads only those passages and answers with numbered citations — or says it cannot find the answer.",
  },
];

export default function Landing() {
  const { status } = useStatus();
  const memories = status?.archive.memories ?? 0;

  return (
    <div className="-mt-10">
      {/* Hero */}
      <section className="relative flex min-h-[82vh] flex-col justify-center overflow-hidden py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-70 blur-[120px]"
          style={{
            background:
              "radial-gradient(closest-side, rgba(200,162,92,0.16), rgba(216,137,74,0.05), transparent)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
          className="relative max-w-3xl"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="border border-gold/30 px-2.5 py-1 text-[9.5px] uppercase tracking-[0.24em] text-gold/90">
              Private memory archive
            </span>
            <span className="text-[9.5px] uppercase tracking-[0.24em] text-muted">
              {memories > 0 ? `${memories} memories preserved` : "Local-first · open-weight AI"}
            </span>
          </div>

          <h1 className="mt-8 font-display text-[clamp(44px,7.2vw,86px)] font-light leading-[0.98] tracking-[-0.02em] text-ivory">
            Some stories
            <br />
            <span className="italic text-gold-bright">deserve to outlive us.</span>
          </h1>

          <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-dim">
            Your memories. Your history. Your stories. Preserved privately, explored intelligently.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/archive" className="btn-gold group">
              Enter Your Archive
              <ArrowRight
                size={14}
                strokeWidth={1.75}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
            <Link to="/vault" className="btn-ghost">
              Explore Demo Archive
            </Link>
          </div>

          <div className="mt-10 flex max-w-xl items-start gap-3 border-t border-ink-line pt-5">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 bg-gold/70" />
            <p className="text-[12px] leading-relaxed text-muted">
              ECHOES keeps every memory in a local SQLite database and a local uploads folder.
              Retrieval runs on this machine. Answers are written by an open-weight model served by
              Ollama on your own hardware — never by a hosted API.
              {status && !status.ai.model_ready && (
                <span className="mt-1.5 block text-marigold/90">
                  The local model is not running right now, so Ask Echoes will show retrieved
                  evidence instead of a written answer until it is started.
                </span>
              )}
            </p>
          </div>
        </motion.div>
      </section>

      {/* Pillars */}
      <section className="border-t border-ink-line py-14">
        <div className="grid gap-9 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, step, title, body }) => (
            <div key={step} className="relative">
              <div className="flex items-center justify-between">
                <Icon size={20} strokeWidth={1.25} className="text-gold/80" />
                <span className="font-display text-[13px] tracking-[0.2em] text-muted">{step}</span>
              </div>
              <h2 className="mt-5 text-[22px] text-ivory">{title}</h2>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Principle */}
      <section className="border-t border-ink-line py-16">
        <div className="mx-auto max-w-3xl text-center">
          <Quote size={22} strokeWidth={1.25} className="mx-auto text-gold/50" />
          <p className="serif-quote mt-6 text-[clamp(20px,2.6vw,30px)] leading-[1.45] text-parchment/90">
            A memory archive should retrieve a real memory, explain its answer with genuine
            evidence, and admit when it does not know.
          </p>
          <p className="mt-6 text-[10px] uppercase tracking-[0.24em] text-muted">
            Not a chatbot · not a cloud service · yours
          </p>
        </div>
      </section>
    </div>
  );
}
