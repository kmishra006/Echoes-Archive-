import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Archive, BookOpen, MessageSquare, Sparkles } from "lucide-react";
import StatusPill from "./StatusPill";
import { useStatus } from "../lib/status";

const NAV = [
  { to: "/archive", label: "Archive", icon: Archive },
  { to: "/vault", label: "Memory Vault", icon: BookOpen },
  { to: "/ask", label: "Ask Echoes", icon: MessageSquare },
  { to: "/remembrance", label: "Remembrance", icon: Sparkles },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { status } = useStatus();

  return (
    <div className="grain relative min-h-screen">
      <header className="sticky top-0 z-50 border-b border-ink-line/80 bg-ink/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="group flex items-baseline gap-3">
            <span className="font-display text-[19px] tracking-[0.42em] text-ivory transition-colors group-hover:text-gold">
              ECHOES
            </span>
            <span className="hidden text-[10px] uppercase tracking-[0.24em] text-muted sm:block">
              a private archive
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    "relative py-2 text-[11px] uppercase tracking-[0.18em] transition-colors",
                    isActive ? "text-gold" : "text-dim hover:text-ivory",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    {label}
                    {isActive && (
                      <span className="absolute -bottom-[1px] left-0 h-px w-full bg-gold/70" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {status && (
              <span className="hidden text-[10px] uppercase tracking-[0.2em] text-muted lg:block">
                {status.archive.memories} memories
              </span>
            )}
            <StatusPill />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-28 pt-10 sm:px-8 md:pb-16">{children}</main>

      <footer className="mx-auto hidden max-w-7xl border-t border-ink-line/70 px-5 py-6 text-[10px] uppercase tracking-[0.2em] text-muted sm:px-8 md:block">
        Local-first archive · FastAPI · SQLite · Ollama · no hosted inference
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-4 border-t border-ink-line bg-ink/95 backdrop-blur-xl md:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "flex flex-col items-center gap-1.5 py-3 text-[9px] uppercase tracking-[0.14em]",
                isActive ? "text-gold" : "text-muted",
              ].join(" ")
            }
          >
            <Icon size={16} strokeWidth={1.5} />
            {label.split(" ")[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
