import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api, type Status } from "./api";

type StatusState = {
  status: Status | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const StatusContext = createContext<StatusState>({
  status: null,
  error: null,
  loading: true,
  refresh: async () => {},
});

export function StatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const next = await api.status();
      setStatus(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 25000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <StatusContext.Provider value={{ status, error, loading, refresh }}>
      {children}
    </StatusContext.Provider>
  );
}

export function useStatus() {
  return useContext(StatusContext);
}
