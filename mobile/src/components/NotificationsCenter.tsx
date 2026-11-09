import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, FlatList, Modal, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Bell, CheckCheck, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "../services/api";
import type { NotificationItem } from "../types/notification";

export function NotificationsCenter() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");
  const loadedOnce = useRef(false);
  const loading = useRef(false);

  const refresh = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const result = await listNotifications();
      setItems(result.items);
      setUnreadCount(result.unreadCount);
      setError("");
      loadedOnce.current = true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar as notificações.");
    } finally {
      loading.current = false;
    }
  }, []);

  useEffect(() => {
    const initialRequest = setTimeout(() => void refresh(), 0);
    const interval = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 30_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      clearTimeout(initialRequest);
      clearInterval(interval);
      subscription.remove();
    };
  }, [refresh]);

  const openItem = async (item: NotificationItem) => {
    try {
      if (!item.readAt) {
        await markNotificationRead(item.id);
        setItems((current) =>
          current.map((notification) =>
            notification.id === item.id ? { ...notification, readAt: new Date().toISOString() } : notification,
          ),
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      setVisible(false);
      if (item.type.startsWith("pedido_")) router.push("/(tabs)/orders");
      else if (item.type.startsWith("reserva_")) router.push("/(tabs)/reservations");
      else if (item.type === "estoque_baixo") router.push("/(tabs)/products");
    } catch (reason) {
      Alert.alert(
        "Notificação",
        reason instanceof Error ? reason.message : "Não foi possível abrir a notificação.",
      );
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? now })));
      setUnreadCount(0);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível marcar as notificações como lidas.");
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ""}`}
        accessibilityHint="Abre a central de notificações."
        onPress={() => {
          setVisible(true);
          if (!loadedOnce.current) void refresh();
        }}
        style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}
      >
        <Bell color={colors.primary} size={22} />
        {unreadCount > 0 ? (
          <View style={{
            position: "absolute",
            top: 4,
            right: 2,
            minWidth: 16,
            height: 16,
            paddingHorizontal: 3,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.destructive,
          }}>
            <Text style={{ color: colors.card, fontFamily: "Inter_700Bold", fontSize: 10 }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        ) : null}
      </Pressable>
      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }}>
          <View style={{
            minHeight: 56,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 18 }}>
              Notificações
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Marcar todas as notificações como lidas"
                disabled={unreadCount === 0}
                onPress={() => void markAllRead()}
                style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", opacity: unreadCount ? 1 : 0.45 }}
              >
                <CheckCheck color={colors.primary} size={21} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar notificações"
                onPress={() => setVisible(false)}
                style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}
              >
                <X color={colors.foreground} size={22} />
              </Pressable>
            </View>
          </View>
          {error ? (
            <Text accessibilityRole="alert" style={{ color: colors.destructive, padding: 16 }}>
              {error}
            </Text>
          ) : null}
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}
            ListEmptyComponent={
              <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 40 }}>
                Nenhuma notificação por enquanto.
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.title}. ${item.message}. ${item.readAt ? "Lida" : "Não lida"}.`}
                onPress={() => void openItem(item)}
                style={{
                  padding: 14,
                  marginBottom: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: item.readAt ? colors.card : colors.secondary,
                }}
              >
                <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 15 }}>
                  {item.title}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 5 }}>
                  {item.message}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 8 }}>
                  {new Date(item.createdAt).toLocaleString("pt-BR")}
                </Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </>
  );
}
