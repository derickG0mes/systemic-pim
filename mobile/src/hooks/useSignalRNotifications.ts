import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { addNotificationResponseReceivedListener } from "expo-notifications";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { getHubUrl } from "../services/http";
import { setupNotificationChannelsAsync, triggerLocalNotificationAsync } from "../services/notifications";
import type { NotificationItem } from "../types/notification";

interface UseSignalRNotificationsOptions {
  enabled: boolean;
  onNotificationReceived?: (notification: NotificationItem) => void;
}

export function useSignalRNotifications({ enabled, onNotificationReceived }: UseSignalRNotificationsOptions) {
  const [connected, setConnected] = useState(false);
  const connectionRef = useRef<HubConnection | null>(null);
  const onReceivedRef = useRef(onNotificationReceived);

  useEffect(() => {
    onReceivedRef.current = onNotificationReceived;
  }, [onNotificationReceived]);

  useEffect(() => {
    void setupNotificationChannelsAsync();

    const responseSubscription = addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { type?: string; link?: string } | undefined;
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
    });

    return () => {
      responseSubscription.remove();
    };
  }, []);

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

      void triggerLocalNotificationAsync(title, message, {
        type: item.type,
        link: item.link ?? item.href,
        id: item.id,
      });

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
