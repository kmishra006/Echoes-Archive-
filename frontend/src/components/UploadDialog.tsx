import { useRef, useState } from "react";
import { FileUp, Upload } from "lucide-react";
import { api, type Memory } from "../lib/api";
import { ErrorNote, Modal } from "./ui";

export default function UploadDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (memory: Memory) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Document");
  const [memoryDate, setMemoryDate] = useState("");
  const [people, setPeople] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setTitle("");
    setCategory("Document");
    setMemoryDate("");
    setPeople("");
    setTags("");
    setError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose a .txt, .md or .pdf file first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await api.upload(file, {
        title: title.trim() || undefined,
        category: category.trim() || undefined,
        memory_date: memoryDate.trim() || undefined,
        people: people.trim() || undefined,
        tags: tags.trim() || undefined,
      });
      onSaved(saved);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import that file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      eyebrow="Import"
      title="Bring in a document"
      width="max-w-xl"
    >
      <form onSubmit={submit} className="space-y-5">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const dropped = event.dataTransfer.files?.[0];
            if (dropped) setFile(dropped);
          }}
          onClick={() => inputRef.current?.click()}
          className={[
            "flex cursor-pointer flex-col items-center justify-center border border-dashed px-6 py-10 text-center transition-colors",
            dragging ? "border-gold/60 bg-gold/[0.05]" : "border-ink-line hover:border-gold/40",
          ].join(" ")}
        >
          <FileUp size={22} strokeWidth={1.25} className="text-gold/70" />
          <p className="mt-3 font-display text-lg text-ivory">
            {file ? file.name : "Drop a file, or click to choose"}
          </p>
          <p className="mt-1.5 text-[11px] uppercase tracking-[0.14em] text-muted">
            {file
              ? `${(file.size / 1024).toFixed(1)} KB selected`
              : ".txt · .md · .pdf — text is extracted and stored locally"}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.md,.markdown,.text,.csv,.pdf"
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="upload-title">
              Title (optional)
            </label>
            <input
              id="upload-title"
              className="field"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Defaults to the file name"
            />
          </div>
          <div>
            <label className="label" htmlFor="upload-category">
              Category
            </label>
            <input
              id="upload-category"
              className="field"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="upload-date">
              Date (optional)
            </label>
            <input
              id="upload-date"
              className="field"
              value={memoryDate}
              onChange={(event) => setMemoryDate(event.target.value)}
              placeholder="1999-07-14"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="label" htmlFor="upload-people">
              People (optional)
            </label>
            <input
              id="upload-people"
              className="field"
              value={people}
              onChange={(event) => setPeople(event.target.value)}
              placeholder="Kamala Mehta"
            />
          </div>
          <div>
            <label className="label" htmlFor="upload-tags">
              Tags (optional)
            </label>
            <input
              id="upload-tags"
              className="field"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="letters, monsoon"
            />
          </div>
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex items-center justify-between border-t border-ink-line pt-5">
          <p className="max-w-[52%] text-[10px] leading-relaxed text-muted">
            Scanned PDFs without a text layer are refused rather than silently imported empty.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn-gold" disabled={busy || !file}>
              <Upload size={13} strokeWidth={1.75} />
              {busy ? "Importing…" : "Import"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
