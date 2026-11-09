import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { readCache, writeCache } from "../services/cache";

export function useCachedResource<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [cacheWarning, setCacheWarning] = useState("");
  const mounted = useRef(false);
  const lastLoadAt = useRef(0);

  const load = useCallback(
    async (manual = false) => {
      if (!manual && mounted.current && Date.now() - lastLoadAt.current < 15_000) return;
      lastLoadAt.current = Date.now();

      if (manual) setRefreshing(true);
      else if (!mounted.current) setLoading(true);
      setError("");

      let cacheFailure = "";
      try {
        const cached = await readCache<T>(key);
        if (cached !== null) {
          setData(cached);
          mounted.current = true;
        }
      } catch (reason) {
        cacheFailure = reason instanceof Error ? reason.message : "Falha ao ler o cache local.";
        setCacheWarning(`Falha ao ler o cache local: ${cacheFailure}`);
      }

      try {
        const fresh = await fetcher();
        setData(fresh);
        mounted.current = true;
        try {
          await writeCache(key, fresh);
          setCacheWarning("");
        } catch (reason) {
          const message = reason instanceof Error ? reason.message : "Falha ao salvar os dados locais.";
          setCacheWarning(`Os dados foram atualizados, mas não foi possível salvar o cache: ${message}`);
        }
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "Não foi possível sincronizar os dados.";
        setError(cacheFailure ? `${message} Cache local: ${cacheFailure}` : message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetcher, key],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const refresh = useCallback((manual = true) => load(manual), [load]);

  return {
    data,
    loading,
    refreshing,
    error,
    cacheWarning,
    refresh,
  };
}
