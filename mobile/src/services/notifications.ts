import {
  AndroidImportance,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from "expo-notifications";
import { Platform } from "react-native";

/**
 * A mesma notificação pode chegar por dois caminhos: SignalR (notificação local, com o app aberto)
 * e push remoto (Expo/FCM/APNs). Os dois carregam o mesmo `id`; guardamos os ids recentes para
 * mostrar cada notificação uma única vez.
 */
const MAX_RECENT_IDS = 200;
const recentNotificationIds = new Set<string>();

function claimNotification(id: unknown): boolean {
  if (typeof id !== "number" && typeof id !== "string") return true;

  const key = String(id);
  if (recentNotificationIds.has(key)) return false;

  recentNotificationIds.add(key);
  if (recentNotificationIds.size > MAX_RECENT_IDS) {
    const oldest = recentNotificationIds.values().next().value;
    if (oldest !== undefined) recentNotificationIds.delete(oldest);
  }
  return true;
}

setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as Record<string, unknown> | undefined;
    // Notificações locais já foram "reivindicadas" ao serem agendadas; um push remoto
    // com o mesmo id (duplicado) é suprimido.
    const show = data?.local === true || claimNotification(data?.id);
    return {
      shouldShowAlert: show,
      shouldPlaySound: show,
      shouldSetBadge: show,
      shouldShowBanner: show,
      shouldShowList: show,
    };
  },
});

export async function setupNotificationChannelsAsync(): Promise<boolean> {
  if (Platform.OS === "android") {
    await setNotificationChannelAsync("systemic-default", {
      name: "Notificações do Sistema",
      importance: AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#863BFF",
      sound: "default",
      showBadge: true,
    });
  }

  const { status: existingStatus } = await getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

export async function triggerLocalNotificationAsync(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  // Se o push remoto desta notificação já foi exibido, não duplica.
  if (!claimNotification(data?.id)) return;

  await scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { ...(data ?? {}), local: true },
      sound: "default",
    },
    trigger: null,
  });
}
