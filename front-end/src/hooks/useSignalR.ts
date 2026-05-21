import { useEffect, useRef, useState } from 'react';
import { HubConnectionBuilder, HubConnection, LogLevel } from '@microsoft/signalr';

/**
 * Hook para conectar ao SignalR Hub "CozinhaHub" e escutar eventos.
 * @param url URL completa do hub (ex.: `${process.env.REACT_APP_API_URL}/cozinhaHub`)
 * @param events Mapeamento de nome‑evento → callback
 */
export function useSignalR(
  url: string,
  events: Record<string, (payload: any) => void>
) {
  const [connected, setConnected] = useState(false);
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(url)
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    // registra callbacks
    Object.entries(events).forEach(([eventName, handler]) => {
      connection.on(eventName, handler);
    });

    connection
      .start()
      .then(() => {
        setConnected(true);
        console.log('SignalR conectado a', url);
      })
      .catch(err => console.error('Erro ao conectar SignalR:', err));

    connectionRef.current = connection;

    return () => {
      connection.stop().then(() => console.log('SignalR desconectado'));
    };
  }, [url, JSON.stringify(events)]);

  return { connected, connection: connectionRef.current };
}
