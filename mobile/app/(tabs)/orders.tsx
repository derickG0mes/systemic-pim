import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ActionButton } from "../../src/components/ActionButton";
import { AppScreen } from "../../src/components/AppScreen";
import { Message } from "../../src/components/Message";
import { Panel } from "../../src/components/Panel";
import { EmptyState, LoadingState } from "../../src/components/ResourceStatus";
import { useCachedResource } from "../../src/hooks/useCachedResource";
import { formatCurrency, formatDateTime, getOrderStatus, orderStatusLabels } from "../../src/lib/format";
import { listOrders, updateOrderStatus } from "../../src/services/api";
import type { CommandDto } from "../../src/types/api";
import { useTheme } from "../../src/contexts/ThemeContext";

function nextStatus(status: "preparing" | "in_progress" | "completed") {
  if (status === "preparing") return "in_progress";
  if (status === "in_progress") return "completed";
  return null;
}

type OrderFilter = "all" | "preparing" | "in_progress" | "completed";

export default function OrdersScreen() {
  const { colors, styles } = useTheme();
  const [filterStatus, setFilterStatus] = useState<OrderFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const loadOrders = useCallback(() => listOrders(), []);
  const resource = useCachedResource<CommandDto[]>("orders", loadOrders);
  const refreshOrders = resource.refresh;
  const polling = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        if (polling.current) return;
        polling.current = true;
        void refreshOrders(false).finally(() => {
          polling.current = false;
        });
      }, 15000);

      return () => clearInterval(interval);
    }, [refreshOrders]),
  );

  const advance = (order: CommandDto) => {
    const status = getOrderStatus(order.itensComanda ?? [], order.statusComanda);
    const following = nextStatus(status);
    if (!following) return;

    Alert.alert(
      "Atualizar status",
      `Avançar o pedido da Mesa ${order.mesa?.numeroMesa ?? order.numeroMesa ?? order.idMesa} para "${orderStatusLabels[following]}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: () => {
            void updateOrderStatus(order.idComanda, following)
              .then(() => resource.refresh())
              .catch((error: unknown) =>
                Alert.alert("Não foi possível atualizar", error instanceof Error ? error.message : "Falha na API."),
              );
          },
        },
      ],
    );
  };

  const orders = useMemo(() => {
    const raw = [...(resource.data ?? [])].sort(
      (first, second) => new Date(second.dataAberta).getTime() - new Date(first.dataAberta).getTime(),
    );

    return raw.filter((order) => {
      const status = getOrderStatus(order.itensComanda ?? [], order.statusComanda);
      if (filterStatus !== "all" && status !== filterStatus) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const tableNumber = String(order.mesa?.numeroMesa ?? order.numeroMesa ?? order.idMesa);
        const matchesTable = tableNumber.includes(query) || `mesa ${tableNumber}`.includes(query);
        const matchesItems = (order.itensComanda ?? []).some((item) => {
          const name = (item.produto?.nomeProduto ?? item.nomeProduto ?? "").toLowerCase();
          return name.includes(query);
        });
        const matchesId = String(order.idComanda).includes(query);
        if (!matchesTable && !matchesItems && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }, [filterStatus, resource.data, searchQuery]);

  return (
    <AppScreen
      title="Pedidos"
      subtitle="Pedidos são adicionados somente a uma mesa com comanda aberta."
      refreshing={resource.refreshing}
      onRefresh={() => void resource.refresh()}
    >
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel="Atualização automática ativa a cada 15 segundos."
        style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}
      >
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
          Atualização automática ativa (15s)
        </Text>
      </View>

      <ActionButton title="Novo pedido" onPress={() => router.push("/pedido/novo")} style={{ marginBottom: 14 }} />

      <TextInput
        accessibilityLabel="Buscar por mesa, item ou comanda"
        placeholder="Buscar por mesa, comanda ou item..."
        placeholderTextColor={colors.mutedForeground}
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={[styles.input, { marginBottom: 10 }]}
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {(["all", "preparing", "in_progress", "completed"] as const).map((st) => (
          <ActionButton
            key={st}
            title={st === "all" ? "Todos" : orderStatusLabels[st]}
            variant={filterStatus === st ? "primary" : "secondary"}
            onPress={() => setFilterStatus(st)}
            style={{ minWidth: 64 }}
          />
        ))}
      </View>

      {resource.error ? <Message kind="error" text={resource.error} /> : null}
      {resource.cacheWarning ? <Message kind="info" text={resource.cacheWarning} /> : null}
      {resource.loading && !resource.data ? <LoadingState label="Carregando pedidos..." /> : null}
      {!resource.loading && orders.length === 0 ? (
        <EmptyState
          text={
            searchQuery.trim() || filterStatus !== "all"
              ? "Nenhum pedido encontrado com os filtros aplicados."
              : "Nenhum pedido encontrado."
          }
        />
      ) : null}
      {orders.map((order) => {
        const status = getOrderStatus(order.itensComanda ?? [], order.statusComanda);
        const tableNumber = order.mesa?.numeroMesa ?? order.numeroMesa ?? order.idMesa;
        const following = nextStatus(status);
        const itemSummary = (order.itensComanda ?? [])
          .map((item) => `${item.qtdProduto} ${item.produto?.nomeProduto ?? item.nomeProduto ?? `Produto ${item.idProduto}`}`)
          .join(", ");
        return (
          <Panel key={order.idComanda}>
            <View
              accessible
              accessibilityRole="text"
              accessibilityLabel={`Pedido da mesa ${tableNumber}, comanda número ${order.idComanda}, status ${orderStatusLabels[status]}, aberto em ${formatDateTime(order.dataAberta)}. Itens: ${itemSummary || "nenhum"}. Total ${formatCurrency(order.valorTotal)}.`}
            >
              <View style={styles.row}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 18 }}>
                  Mesa {tableNumber}
                </Text>
                <Text style={{ color: status === "completed" ? colors.success : colors.info, fontFamily: "Inter_600SemiBold" }}>
                  {orderStatusLabels[status]}
                </Text>
              </View>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 5 }}>
                Comanda #{order.idComanda} · {formatDateTime(order.dataAberta)}
              </Text>
              {(order.itensComanda ?? []).map((item) => (
                <Text key={item.idItemComanda} style={{ color: colors.foreground, fontFamily: "Inter_400Regular", marginTop: 8 }}>
                  {item.qtdProduto} × {item.produto?.nomeProduto ?? item.nomeProduto ?? `Produto ${item.idProduto}`}
                </Text>
              ))}
              <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 16, marginTop: 10 }}>
                Total: {formatCurrency(order.valorTotal)}
              </Text>
            </View>
            {following ? (
              <ActionButton
                title={`Avançar para ${orderStatusLabels[following]}`}
                onPress={() => advance(order)}
                style={{ marginTop: 12 }}
              />
            ) : null}
          </Panel>
        );
      })}
      <View style={{ height: 6 }} />
    </AppScreen>
  );
}
