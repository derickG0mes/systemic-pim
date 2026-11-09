import { useCallback, useRef, useState, type ReactNode } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { AlertTriangle, DollarSign, ShoppingCart, TrendingUp } from "lucide-react-native";
import { ActionButton } from "../../src/components/ActionButton";
import { AuthGate } from "../../src/components/AuthGate";
import { AppScreen } from "../../src/components/AppScreen";
import { Message } from "../../src/components/Message";
import { Panel } from "../../src/components/Panel";
import { LoadingState } from "../../src/components/ResourceStatus";
import { useAuth } from "../../src/contexts/AuthContext";
import { useTheme } from "../../src/contexts/ThemeContext";
import { formatCurrency, getOrderStatus } from "../../src/lib/format";
import {
  getDailyFinancialSummary,
  getRevenueByPayment,
  getTopProducts,
  listOrders,
} from "../../src/services/api";
import type { FinancialSummary } from "../../src/types/api";
import { router, useFocusEffect } from "expo-router";

interface DashboardData {
  summary: FinancialSummary;
  payments: { name: string; total: number }[];
  topProducts: { name: string; quantity: number }[];
  completedOrders: number;
}

function todayRange() {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return { start: `${date}T00:00:00`, end: `${date}T23:59:59.999` };
}

function DashboardContent() {
  const { user } = useAuth();
  const { colors, styles } = useTheme();
  const { width } = useWindowDimensions();
  const metricColumns = width >= 1024 ? 4 : width >= 640 ? 2 : 1;
  const metricWidth =
    metricColumns === 1 ? "100%" : (width - 32 - 12 * (metricColumns - 1)) / metricColumns;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const hasData = useRef(false);
  const lastLoadAt = useRef(0);

  const load = useCallback(async (manual = false) => {
    if (!manual && hasData.current && Date.now() - lastLoadAt.current < 15_000) return;
    lastLoadAt.current = Date.now();

    if (manual) setRefreshing(true);
    else if (!hasData.current) setLoading(true);
    setError("");
    try {
      const { start, end } = todayRange();
      const [summary, payments, products, orders] = await Promise.all([
        getDailyFinancialSummary(),
        getRevenueByPayment(start, end),
        getTopProducts(),
        listOrders(),
      ]);
      setData({
        summary,
        payments: payments.map((item) => ({
          name: item.formaPagemento ?? item.formaPagamento ?? "Outra forma",
          total: Number(item.total ?? 0),
        })),
        topProducts: products
          .map((item) => ({ name: item.nomeProduto, quantity: Number(item.quantidadeVendida ?? 0) }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5),
        completedOrders: orders.filter(
          (order) => getOrderStatus(order.itensComanda ?? [], order.statusComanda) === "completed",
        ).length,
      });
      hasData.current = true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao carregar o resumo financeiro.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <AppScreen
      title="Dashboard"
      subtitle={`Acompanhamento do dia${user?.nome ? ` · ${user.nome}` : ""}.`}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
    >
      {error ? <Message kind="error" text={error} /> : null}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
        <ActionButton
          title="Relatórios"
          variant="secondary"
          onPress={() => router.push("/reports" as never)}
          style={{ flex: 1 }}
        />
        <ActionButton
          title="Usuários"
          variant="secondary"
          onPress={() => router.push("/users" as never)}
          style={{ flex: 1 }}
        />
        <ActionButton
          title="Auditoria"
          variant="secondary"
          onPress={() => router.push("/audit" as never)}
          style={{ flex: 1 }}
        />
      </View>
      {loading && !data ? <LoadingState label="Carregando faturamento..." /> : null}
      {data ? (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <View style={{ width: metricWidth }}>
              <MetricCard
                title="Vendas do Dia"
                value={formatCurrency(data.summary.receita)}
                color={colors.primary}
                icon={<DollarSign color={colors.primary} size={22} />}
              />
            </View>
            <View style={{ width: metricWidth }}>
              <MetricCard
                title="Lucro Líquido"
                value={formatCurrency(data.summary.lucro)}
                color={colors.success}
                icon={<TrendingUp color={colors.success} size={22} />}
              />
            </View>
            <View style={{ width: metricWidth }}>
              <MetricCard
                title="Pedidos Completos"
                value={String(data.completedOrders)}
                color={colors.info}
                icon={<ShoppingCart color={colors.info} size={22} />}
              />
            </View>
            <View style={{ width: metricWidth }}>
              <MetricCard
                title="Despesas / Receita"
                value={`${data.summary.receita > 0 ? ((data.summary.despesas / data.summary.receita) * 100).toFixed(1) : "0.0"}%`}
                color={data.summary.receita > 0 && data.summary.despesas / data.summary.receita > 0.2 ? colors.destructive : colors.warning}
                alert={data.summary.receita > 0 && data.summary.despesas / data.summary.receita > 0.2}
                icon={<AlertTriangle color={data.summary.receita > 0 && data.summary.despesas / data.summary.receita > 0.2 ? colors.destructive : colors.warning} size={22} />}
              />
            </View>
          </View>
          <Panel>
            <Text style={styles.sectionTitle}>Produtos Mais Vendidos</Text>
            {data.topProducts.length === 0 ? (
              <Text style={styles.bodyText}>Nenhuma venda registrada.</Text>
            ) : data.topProducts.map((item, index) => {
              const maxQuantity = Math.max(...data.topProducts.map((product) => product.quantity), 1);
              return (
                <View key={`${item.name}-${index}`} style={{ marginTop: 12 }}>
                  <View style={styles.row}>
                    <Text numberOfLines={1} style={{ flex: 1, color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 14 }}>
                      {item.name}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                      {item.quantity}
                    </Text>
                  </View>
                  <View style={{ height: 7, backgroundColor: colors.muted, borderRadius: 4, marginTop: 6, overflow: "hidden" }}>
                    <View style={{ width: `${Math.max(4, (item.quantity / maxQuantity) * 100)}%`, height: "100%", backgroundColor: colors.primaryBright, borderRadius: 4 }} />
                  </View>
                </View>
              );
            })}
          </Panel>
          <Panel>
            <Text style={styles.sectionTitle}>Vendas por Pagamento</Text>
            {data.payments.length === 0 ? (
              <Text style={styles.bodyText}>Nenhuma venda fechada hoje</Text>
            ) : data.payments.map((item, index) => (
              <View key={`${item.name}-${index}`} style={[styles.row, { justifyContent: "flex-start", marginTop: 12 }]}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.chart[index % colors.chart.length] }} />
                <Text style={{ flex: 1, color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 14 }}>
                  {item.name}
                </Text>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                  {formatCurrency(item.total)}
                </Text>
              </View>
            ))}
          </Panel>
          {data.summary.receita > 0 && data.summary.despesas / data.summary.receita > 0.2 ? (
            <Panel style={{ borderColor: colors.destructive, backgroundColor: colors.destructiveSoft }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <AlertTriangle color={colors.destructive} size={24} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.destructive, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                    Alerta de Despesas
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 3 }}>
                    As despesas ultrapassaram 20% da receita.
                  </Text>
                </View>
              </View>
            </Panel>
          ) : null}
        </>
      ) : null}
    </AppScreen>
  );
}

function MetricCard({
  title,
  value,
  color,
  icon,
  alert = false,
}: {
  title: string;
  value: string;
  color: string;
  icon: ReactNode;
  alert?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Panel style={alert ? { borderColor: colors.destructive, marginBottom: 0 } : { marginBottom: 0 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ padding: 9, borderRadius: 9, backgroundColor: colors.muted }}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12 }}>
            {title}
          </Text>
          <Text style={{ color, fontFamily: "Inter_700Bold", fontSize: 21, marginTop: 3 }}>
            {value}
          </Text>
        </View>
      </View>
    </Panel>
  );
}

export default function DashboardScreen() {
  return (
    <AuthGate managerOnly>
      <DashboardContent />
    </AuthGate>
  );
}
