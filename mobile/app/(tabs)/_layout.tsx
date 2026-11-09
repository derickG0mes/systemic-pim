import { Tabs, router } from "expo-router";
import { Alert, Pressable, Text, View, useWindowDimensions } from "react-native";
import {
  Accessibility,
  CalendarClock,
  LayoutDashboard,
  Package,
  ShoppingCart,
  UtensilsCrossed,
} from "lucide-react-native";
import { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthGate } from "../../src/components/AuthGate";
import { NotificationsCenter } from "../../src/components/NotificationsCenter";
import { useAuth } from "../../src/contexts/AuthContext";
import { listComandas, listOpenComandas, listProducts, listTables } from "../../src/services/api";
import { writeCache } from "../../src/services/cache";
import { colors } from "../../src/theme/colors";

function TabNavigation() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isManager = user?.role === "admin" || user?.role === "owner";
  const syncedSession = useRef("");

  useEffect(() => {
    if (!user) {
      syncedSession.current = "";
      return;
    }
    if (syncedSession.current === String(user.id)) return;
    syncedSession.current = String(user.id);
    let active = true;

    void Promise.allSettled([listTables(), listOpenComandas(), listComandas(), listProducts()]).then(async (results) => {
      if (!active) return;
      const failures: string[] = [];
      const [tablesResult, commandsResult, allCommandsResult, productsResult] = results;

      if (tablesResult.status === "fulfilled") {
        await writeCache("tables", tablesResult.value);
      } else {
        failures.push(tablesResult.reason instanceof Error ? tablesResult.reason.message : "Falha ao sincronizar mesas.");
      }

      if (commandsResult.status === "fulfilled") {
        await writeCache("open-comandas", commandsResult.value);
      } else {
        failures.push(commandsResult.reason instanceof Error ? commandsResult.reason.message : "Falha ao sincronizar comandas.");
      }

      if (tablesResult.status === "fulfilled" && commandsResult.status === "fulfilled") {
        await writeCache("tables-and-open-comandas", {
          tables: tablesResult.value,
          commands: commandsResult.value,
          allCommands: allCommandsResult.status === "fulfilled" ? allCommandsResult.value : [],
        });
      }

      if (allCommandsResult.status === "fulfilled") {
        await writeCache("all-comandas", allCommandsResult.value);
      } else {
        failures.push(allCommandsResult.reason instanceof Error ? allCommandsResult.reason.message : "Falha ao sincronizar histórico de comandas.");
      }

      if (productsResult.status === "fulfilled") {
        await writeCache("products", productsResult.value);
      } else {
        failures.push(productsResult.reason instanceof Error ? productsResult.reason.message : "Falha ao sincronizar produtos.");
      }

      if (active && failures.length > 0) {
        Alert.alert("Sincronização incompleta", failures.join("\n"));
      }
    }).catch((error: unknown) => {
      if (active) {
        Alert.alert(
          "Falha no cache local",
          error instanceof Error ? error.message : "Não foi possível salvar os dados sincronizados.",
        );
      }
    });

    return () => {
      active = false;
    };
  }, [user]);

  const handleLogout = () => {
    Alert.alert("Sair", "Deseja encerrar sua sessão?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: () => {
          void logout().catch((error: unknown) => {
            Alert.alert(
              "Sessão encerrada",
              error instanceof Error ? error.message : "Não foi possível confirmar o logout no servidor.",
            );
            router.replace("/login");
          });
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.foreground,
        headerTitleStyle: { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
        headerTitle: () => (
          <View style={{ maxWidth: Math.max(120, width - 200) }}>
            <Text
              numberOfLines={1}
              style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16 }}
            >
              Systemic
            </Text>
            {user?.nome ? (
              <Text
                numberOfLines={1}
                style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}
              >
                {user.nome}
              </Text>
            ) : null}
          </View>
        ),
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 64 + insets.bottom,
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 6),
        },
        tabBarItemStyle: { minHeight: 54 },
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 12 },
        headerRight: () => (
          <>
            <NotificationsCenter />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir acessibilidade"
              onPress={() => router.push("/accessibility")}
              style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}
            >
              <Accessibility color={colors.primary} size={22} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sair da conta"
              onPress={handleLogout}
              style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }}
            >
              <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Sair</Text>
            </Pressable>
          </>
        ),
        }}
      >
      <Tabs.Screen
        name="tables"
        options={{
          title: "Mesas",
          tabBarLabel: "Mesas",
          tabBarIcon: ({ color, size }) => <UtensilsCrossed color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Pedidos",
          tabBarLabel: "Pedidos",
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: "Reservas",
          tabBarLabel: "Reservas",
          tabBarIcon: ({ color, size }) => <CalendarClock color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Resumo",
          tabBarLabel: "Resumo",
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
          href: isManager ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Produtos",
          tabBarLabel: "Produtos",
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
          href: isManager ? undefined : null,
        }}
      />
      </Tabs>
    </View>
  );
}

export default function TabLayout() {
  return (
    <AuthGate>
      <TabNavigation />
    </AuthGate>
  );
}
