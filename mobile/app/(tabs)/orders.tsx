import { useCallback, useRef } from "react";
import { Alert, Text, View } from "react-native";
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
import { colors } from "../../src/theme/colors";
import { styles } from "../../src/theme/styles";

function nextStatus(status: "preparing" | "in_progress" | "completed") {
  if (status === "preparing") return "in_progress";
  if (status === "in_progress") return "completed";
  return null;
}

export default function OrdersScreen() {
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

  const orders = [...(resource.data ?? [])].sort(
    (first, second) => new Date(second.dataAberta).getTime() - new Date(first.dataAberta).getTime(),
  );
  return (
    <AppScreen
      title="Pedidos"
      subtitle="Pedidos são adicionados somente a uma mesa com comanda aberta."
      refreshing={resource.refreshing}
      onRefresh={() => void resource.refresh()}
    >
      <ActionButton title="Novo pedido" onPress={() => router.push("/pedido/novo")} style={{ marginBottom: 14 }} />
      {resource.error ? <Message kind="error" text={resource.error} /> : null}
      {resource.cacheWarning ? <Message kind="info" text={resource.cacheWarning} /> : null}
      {resource.loading && !resource.data ? <LoadingState label="Carregando pedidos..." /> : null}
      {!resource.loading && orders.length === 0 ? <EmptyState text="Nenhum pedido encontrado." /> : null}
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
