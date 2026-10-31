import { useEffect, useState } from "react";
import { api, type Memory } from "../lib/api";
import { ErrorNote, Modal } from "./ui";

const CATEGORIES = [
  "Story",
  "Recipe",
  "Letter",
  "Photograph",
  "Tradition",
  "Home",
  "Journey",
  "Milestone",
  "Object",
  "Reflection",
  "Document",
];

type FormState = {
  title: string;
  content: string;
  memory_date: string;
  category: string;
  people: string;
  tags: string;
};

const EMPTY: FormState = {
  title: "",
  content: "",
  memory_date: "",
  category: "Story",
  people: "",
  tags: "",
};

export default function MemoryForm({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Memory | null;
  onSaved: (memory: Memory) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (initial) {
      setForm({
        title: initial.title,
        content: initial.content,
        memory_date: initial.memory_date ?? "",
        category: initial.category,
        people: initial.people.join(", "),
        tags: initial.tags.join(", "),
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, initial]);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setError("A memory needs a title and some words. Both fields are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        memory_date: form.memory_date.trim() || null,
        category: form.category.trim() || "Story",
        people: form.people
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        tags: form.tags
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      };
      const saved = initial
        ? await api.updateMemory(initial.id, payload)
        : await api.createMemory(payload);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this memory.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={initial ? "Edit entry" : "New entry"}
      title={initial ? "Revise this memory" : "Add a memory"}
    >
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label" htmlFor="memory-title">
            Title
          </label>
          <input
            id="memory-title"
            className="field"
            value={form.title}
            onChange={(event) => set("title")(event.target.value)}
            placeholder="Kamala's kheer"
            autoFocus
          />
        </div>

        <div>
          <label className="label" htmlFor="memory-content">
            The memory itself
          </label>
          <textarea
            id="memory-content"
            className="field min-h-[190px] resize-y leading-relaxed"
            value={form.content}
            onChange={(event) => set("content")(event.target.value)}
            placeholder="Write it the way you would tell it to someone who was not there."
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="memory-date">
              Date (optional)
            </label>
            <input
              id="memory-date"
              className="field"
              value={form.memory_date}
              onChange={(event) => set("memory_date")(event.target.value)}
              placeholder="1974-11-03 · 1974-11 · 1974"
              inputMode="numeric"
            />
            <p className="mt-1.5 text-[10px] text-muted">Year, year-month, or full date.</p>
          </div>
          <div>
            <label className="label" htmlFor="memory-category">
              Category
            </label>
            <input
              id="memory-category"
              className="field"
              list="echoes-categories"
              value={form.category}
              onChange={(event) => set("category")(event.target.value)}
            />
            <datalist id="echoes-categories">
              {CATEGORIES.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="memory-people">
              People
            </label>
            <input
              id="memory-people"
              className="field"
              value={form.people}
              onChange={(event) => set("people")(event.target.value)}
              placeholder="Kamala Mehta, Sumitra"
            />
          </div>
          <div>
            <label className="label" htmlFor="memory-tags">
              Tags
            </label>
            <input
              id="memory-tags"
              className="field"
              value={form.tags}
              onChange={(event) => set("tags")(event.target.value)}
              placeholder="diwali, recipe, grandma"
            />
            <p className="mt-1.5 text-[10px] text-muted">
              Comma separated. Tags are searchable, so family nicknames belong here.
            </p>
          </div>
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex items-center justify-end gap-3 border-t border-ink-line pt-5">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-gold" disabled={saving}>
            {saving ? "Saving…" : initial ? "Save changes" : "Add to archive"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
