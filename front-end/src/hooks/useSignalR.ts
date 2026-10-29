import { useEffect, useRef, useState } from "react";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { hasAuthSession } from "@/services/api";

/**
 * Hook para conectar ao SignalR Hub "CozinhaHub" e escutar eventos.
 * @param url URL completa do hub
 * @param events Mapeamento de nome‑evento → callback
 */
export function useSignalR(
  url: string,
  events: Record<string, (payload: unknown) => void>,
) {
  const [connected, setConnected] = useState(false);
  const [enabled, setEnabled] = useState(() => hasAuthSession());
  const connectionRef = useRef<HubConnection | null>(null);
  const eventsRef = useRef(events);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    const updateAuthentication = () => setEnabled(hasAuthSession());
    window.addEventListener("authSessionChanged", updateAuthentication);
    return () => window.removeEventListener("authSessionChanged", updateAuthentication);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      connectionRef.current = null;
      return;
    }

    let stopped = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const connection = new HubConnectionBuilder()
      .withUrl(url, {
        withCredentials: true,
      })
      .configureLogging(LogLevel.Warning)
      .withAutomaticReconnect()
      .build();

    Object.keys(eventsRef.current).forEach((eventName) => {
      connection.on(eventName, (payload: unknown) => eventsRef.current[eventName]?.(payload));
    });

    const scheduleRetry = () => {
      if (stopped || retryTimer) return;
      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        void startConnection();
      }, 5000);
    };

    const startConnection = async () => {
      if (stopped || connection.state !== "Disconnected") return;
      try {
        await connection.start();
        if (stopped) {
          await connection.stop();
          return;
        }
        setConnected(true);
      } catch (error) {
        setConnected(false);
        console.error("Erro ao conectar SignalR:", error);
        scheduleRetry();
      }
    };

    connection.onreconnecting(() => {
      if (!stopped) setConnected(false);
    });
    connection.onreconnected(() => {
      if (!stopped) setConnected(true);
    });
    connection.onclose(() => {
      if (stopped) return;
      setConnected(false);
      scheduleRetry();
    });

    connectionRef.current = connection;
    void startConnection();

    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      connectionRef.current = null;
      void connection.stop();
    };
  }, [enabled, url]);

  return { connected, enabled, connection: connectionRef.current };
}
