import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import { DEFAULT_ACTION_IDENTIFIER, useLastNotificationResponse } from "expo-notifications";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { getHubUrl } from "../services/http";
import { setupNotificationChannelsAsync, triggerLocalNotificationAsync } from "../services/notifications";
import { isPushRegistered } from "../services/pushRegistration";
import type { NotificationItem } from "../types/notification";

interface UseSignalRNotificationsOptions {
  enabled: boolean;
  onNotificationReceived?: (notification: NotificationItem) => void;
}

// Evita tratar o mesmo toque mais de uma vez quando o componente é montado de novo.
let lastHandledResponseKey = "";

function routeFromNotificationData(data: { type?: string; link?: string } | undefined) {
  const type = data?.type ?? "";

  if (type.startsWith("pedido_")) {
    router.push("/(tabs)/orders");
  } else if (type.startsWith("reserva_")) {
    router.push("/(tabs)/reservations");
  } else if (type === "estoque_baixo") {
    router.push("/(tabs)/products");
  } else if (data?.link) {
    if (data.link.includes("orders")) router.push("/(tabs)/orders");
    else if (data.link.includes("reservations")) router.push("/(tabs)/reservations");
    else if (data.link.includes("inventory")) router.push("/(tabs)/products");
  }
}

export function useSignalRNotifications({ enabled, onNotificationReceived }: UseSignalRNotificationsOptions) {
  const [connected, setConnected] = useState(false);
  const connectionRef = useRef<HubConnection | null>(null);
  const onReceivedRef = useRef(onNotificationReceived);
  const lastResponse = useLastNotificationResponse();

  useEffect(() => {
    onReceivedRef.current = onNotificationReceived;
  }, [onNotificationReceived]);

  useEffect(() => {
    void setupNotificationChannelsAsync();
  }, []);

  // Toque em uma notificação: funciona com o app aberto, em segundo plano ou iniciado pelo toque.
  useEffect(() => {
    if (!lastResponse || lastResponse.actionIdentifier !== DEFAULT_ACTION_IDENTIFIER) return;

    const { notification, actionIdentifier } = lastResponse;
    const key = `${notification.request.identifier}:${actionIdentifier}:${notification.date}`;
    if (key === lastHandledResponseKey) return;
    lastHandledResponseKey = key;

    routeFromNotificationData(
      notification.request.content.data as { type?: string; link?: string } | undefined,
    );
  }, [lastResponse]);

  useEffect(() => {
    if (!enabled) {
      if (connectionRef.current) {
        void connectionRef.current.stop();
        connectionRef.current = null;
      }
      return;
    }

    let isDisposed = false;
    let hubUrl: string;
    try {
      hubUrl = getHubUrl("/hubs/notificacoes");
    } catch {
      return;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: true,
      })
      .configureLogging(LogLevel.Warning)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();

    connectionRef.current = connection;

    connection.on("NotificationCreated", (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const item = payload as Partial<NotificationItem>;
      const title = item.title ?? "Nova Notificação";
      const message = item.message ?? "";

      // Com o app em segundo plano e o push remoto registrado, quem exibe a notificação é o push
      // (o sistema a mostra sozinho); disparar a local também geraria uma notificação duplicada.
      if (AppState.currentState === "active" || !isPushRegistered()) {
        void triggerLocalNotificationAsync(title, message, {
          type: item.type,
          link: item.link ?? item.href,
          id: item.id,
        });
      }

      if (item.id && item.title && item.message && item.type && item.createdAt) {
        onReceivedRef.current?.(item as NotificationItem);
      }
    });

    connection.onreconnecting(() => {
      if (!isDisposed) setConnected(false);
    });

    connection.onreconnected(() => {
      if (!isDisposed) setConnected(true);
    });

    connection.onclose(() => {
      if (!isDisposed) setConnected(false);
    });

    void connection
      .start()
      .then(() => {
        if (!isDisposed) setConnected(true);
      })
      .catch((err) => {
        // Fallback silencioso: a polling HTTP continuará funcionando
        console.warn("SignalR não pôde conectar ao hub de notificações:", err);
      });

    return () => {
      isDisposed = true;
      if (connectionRef.current) {
        void connectionRef.current.stop();
        connectionRef.current = null;
      }
      setConnected(false);
    };
  }, [enabled]);

  return { connected };
}
