/** Typed client for the ECHOES API. Every screen goes through this module. */

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

export type Memory = {
  id: string;
  title: string;
  content: string;
  memory_date: string | null;
  category: string;
  people: string[];
  tags: string[];
  source: {
    type?: string;
    filename?: string;
    stored_as?: string;
    bytes?: number;
    pages?: number | null;
    kind?: string;
  };
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type AiStatus = {
  provider: string;
  model: string;
  available: boolean;
  model_ready: boolean;
  models: string[];
  detail: string;
  endpoint: string;
  local: boolean;
};

export type Status = {
  backend: { ok: boolean; version: string };
  ai: AiStatus;
  archive: { memories: number; demo_memories: number; uploads: number; people: number };
  storage: { database: string; uploads: string; data_dir: string };
  retrieval: { engine: string; provider_note: string };
};

export type Stats = {
  total_memories: number;
  demo_memories: number;
  people: string[];
  people_count: number;
  categories: { name: string; count: number }[];
  recent: Memory[];
  upload_count: number;
};

export type Source = {
  index: number;
  memory_id: string;
  title: string;
  memory_date: string | null;
  category: string;
  people: string[];
  text: string;
  excerpt: string;
  score: number;
  coverage: number;
  match_ratio: number;
};

export type AskStatus = "answered" | "not_found" | "model_unavailable" | "model_error";

export type AskResponse = {
  status: AskStatus;
  question: string;
  answer: string;
  message: string;
  sources: Source[];
  cited: number[];
  model: { provider: string; name: string; local: boolean; latency_ms: number };
  diagnostics: {
    query_terms: string[];
    passages_indexed: number;
    min_match_ratio: number;
    hits: number;
    top_coverage: number;
    top_match_ratio: number;
  };
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta: Partial<AskResponse>;
  created_at: string;
};

export type TimelineEntry = {
  id: string;
  title: string;
  category: string;
  memory_date: string;
  people: string[];
  year: string;
  excerpt: string;
};

export type MemoryInput = {
  title: string;
  content: string;
  memory_date?: string | null;
  category?: string;
  people?: string[];
  tags?: string[];
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new Error(
      "The archive server is not reachable. Is the FastAPI backend running on port 8000?",
    );
  }
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { detail?: string };
      if (data.detail) detail = data.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  status: () => request<Status>("/api/status"),
  stats: () => request<Stats>("/api/stats"),
  timeline: () => request<TimelineEntry[]>("/api/timeline"),

  memories: (params: { q?: string; category?: string; demo?: boolean } = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.category) search.set("category", params.category);
    if (params.demo) search.set("demo", "true");
    const suffix = search.toString();
    return request<Memory[]>(`/api/memories${suffix ? `?${suffix}` : ""}`);
  },
  memory: (id: string) => request<Memory>(`/api/memories/${id}`),
  createMemory: (input: MemoryInput) =>
    request<Memory>("/api/memories", { method: "POST", body: JSON.stringify(input) }),
  updateMemory: (id: string, input: Partial<MemoryInput>) =>
    request<Memory>(`/api/memories/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteMemory: (id: string) => request<{ deleted: string }>(`/api/memories/${id}`, { method: "DELETE" }),

  upload: (file: File, meta: { title?: string; category?: string; memory_date?: string; people?: string; tags?: string }) => {
    const body = new FormData();
    body.append("file", file);
    if (meta.title) body.append("title", meta.title);
    if (meta.category) body.append("category", meta.category);
    if (meta.memory_date) body.append("memory_date", meta.memory_date);
    if (meta.people) body.append("people", meta.people);
    if (meta.tags) body.append("tags", meta.tags);
    return request<Memory>("/api/memories/upload", { method: "POST", body });
  },

  ask: (question: string) =>
    request<AskResponse>("/api/ask", { method: "POST", body: JSON.stringify({ question }) }),
  conversation: () => request<ChatMessage[]>("/api/conversation"),
  clearConversation: () => request<{ removed: number }>("/api/conversation", { method: "DELETE" }),

  seedDemo: () => request<{ created: number; total: number }>("/api/demo/seed", { method: "POST" }),
  clearDemo: () => request<{ removed: number }>("/api/demo", { method: "DELETE" }),
};
