import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 border-b border-ink-line pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 text-[32px] leading-[1.1] tracking-[-0.01em] text-ivory sm:text-[42px]">
          {title}
        </h1>
        {description && <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-ink-line px-6 py-16 text-center">
      <div className="mb-5 text-gold/70">{icon}</div>
      <h3 className="text-xl text-ivory">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="border-l border-marigold/60 bg-marigold/[0.06] px-4 py-2.5 text-xs leading-relaxed text-marigold">
      {children}
    </p>
  );
}

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  width = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-ink/80 px-4 py-10 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${width} border border-ink-line bg-ink-soft shadow-[0_30px_120px_-40px_rgba(0,0,0,0.9)]`}
      >
        <div className="flex items-start justify-between border-b border-ink-line px-6 py-5">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 className="mt-1.5 text-2xl text-ivory">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted transition-colors hover:text-ivory"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted">
      <span className="h-1.5 w-1.5 animate-pulse bg-gold" />
      {label}
    </span>
  );
}
