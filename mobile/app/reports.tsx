import { useCallback, useState, type ReactNode } from "react";
import { ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CreditCard, DollarSign, Receipt, TrendingUp } from "lucide-react-native";
import { ActionButton } from "../src/components/ActionButton";
import { AppScreen } from "../src/components/AppScreen";
import { AuthGate } from "../src/components/AuthGate";
import { Message } from "../src/components/Message";
import { Panel } from "../src/components/Panel";
import { LoadingState } from "../src/components/ResourceStatus";
import { useTheme } from "../src/contexts/ThemeContext";
import { formatCurrency } from "../src/lib/format";
import { getFinancialReport, getRevenueByPayment } from "../src/services/api";
import type { FinancialSummary } from "../src/types/api";

function formatIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface DaySales {
  dateLabel: string;
  total: number;
}

function ReportsContent() {
  const { colors, styles } = useTheme();
  const { width } = useWindowDimensions();
  const metricColumns = width >= 640 ? 3 : 1;
  const metricWidth = metricColumns === 1 ? "100%" : (width - 32 - 12 * (metricColumns - 1)) / metricColumns;

  const todayStr = formatIsoDate(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [report, setReport] = useState<FinancialSummary | null>(null);
  const [paymentData, setPaymentData] = useState<{ name: string; total: number }[]>([]);
  const [weeklySales, setWeeklySales] = useState<DaySales[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (dateTarget: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const start = `${dateTarget}T00:00:00`;
      const end = `${dateTarget}T23:59:59.999`;

      const [summaryResult, paymentsResult] = await Promise.all([
        getFinancialReport(start, end),
        getRevenueByPayment(start, end),
      ]);

      setReport({
        receita: Number(summaryResult.receita ?? 0),
        despesas: Number(summaryResult.despesas ?? 0),
        lucro: Number(summaryResult.lucro ?? 0),
      });

      setPaymentData(
        (paymentsResult ?? []).map((row) => ({
          name: row.formaPagemento ?? row.formaPagamento ?? "Outros",
          total: Number(row.total ?? 0),
        })),
      );

      // Carrega os últimos 7 dias para o gráfico comparativo
      const targetDateObj = new Date(`${dateTarget}T12:00:00`);
      const days: DaySales[] = await Promise.all(
        Array.from({ length: 7 }, async (_, index) => {
          const d = new Date(targetDateObj);
          d.setDate(d.getDate() - (6 - index));
          const dayStr = formatIsoDate(d);
          const r = await getFinancialReport(`${dayStr}T00:00:00`, `${dayStr}T23:59:59.999`).catch(() => ({
            receita: 0,
            despesas: 0,
            lucro: 0,
          }));
          return {
            dateLabel: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
            total: Number(r.receita ?? 0),
          };
        }),
      );
      setWeeklySales(days);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar os relatórios.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(selectedDate);
    }, [load, selectedDate]),
  );

  const setShortcutDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    setSelectedDate(formatIsoDate(d));
  };

  const maxWeekly = Math.max(...weeklySales.map((w) => w.total), 1);

  return (
    <AppScreen
      title="Relatórios"
      subtitle="Faturamento, despesas e vendas por forma de pagamento."
      refreshing={refreshing}
      onRefresh={() => void load(selectedDate, true)}
      safeArea
    >
      <ActionButton
        title="Voltar ao Início"
        variant="secondary"
        onPress={() => router.back()}
        style={{ marginBottom: 12 }}
      />

      <Panel>
        <Text style={styles.sectionTitle}>Período de Análise</Text>
        <Text style={styles.fieldLabel}>Data (AAAA-MM-DD)</Text>
        <TextInput
          accessibilityLabel="Data do relatório"
          value={selectedDate}
          onChangeText={setSelectedDate}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numbers-and-punctuation"
          style={styles.input}
        />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <ActionButton
            title="Hoje"
            variant={selectedDate === todayStr ? "primary" : "secondary"}
            onPress={() => setShortcutDate(0)}
            style={{ flex: 1 }}
          />
          <ActionButton
            title="Ontem"
            variant="secondary"
            onPress={() => setShortcutDate(1)}
            style={{ flex: 1 }}
          />
          <ActionButton
            title="7 dias atrás"
            variant="secondary"
            onPress={() => setShortcutDate(7)}
            style={{ flex: 1 }}
          />
        </View>
      </Panel>

      {error ? <Message kind="error" text={error} /> : null}
      {loading && !report ? <LoadingState label="Carregando dados financeiros..." /> : null}

      {report ? (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <View style={{ width: metricWidth }}>
              <MetricCard
                title="Receita do Dia"
                value={formatCurrency(report.receita)}
                color={colors.primary}
                icon={<DollarSign color={colors.primary} size={22} />}
              />
            </View>
            <View style={{ width: metricWidth }}>
              <MetricCard
                title="Despesas"
                value={formatCurrency(report.despesas)}
                color={colors.destructive}
                icon={<Receipt color={colors.destructive} size={22} />}
              />
            </View>
            <View style={{ width: metricWidth }}>
              <MetricCard
                title="Lucro Líquido"
                value={formatCurrency(report.lucro)}
                color={colors.success}
                icon={<TrendingUp color={colors.success} size={22} />}
              />
            </View>
          </View>

          <Panel>
            <Text style={styles.sectionTitle}>Vendas nos Últimos 7 Dias</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }}>
              <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-end", height: 160, paddingBottom: 10 }}>
                {weeklySales.map((day) => {
                  const heightPercent = Math.max(8, Math.round((day.total / maxWeekly) * 120));
                  return (
                    <View key={day.dateLabel} style={{ alignItems: "center", width: 50 }}>
                      <Text style={{ color: colors.mutedForeground, fontSize: 10, marginBottom: 4 }}>
                        {formatCurrency(day.total).split(",")[0]}
                      </Text>
                      <View
                        style={{
                          width: 24,
                          height: heightPercent,
                          backgroundColor: colors.primary,
                          borderRadius: 6,
                        }}
                      />
                      <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 6 }}>
                        {day.dateLabel}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </Panel>

          <Panel>
            <Text style={styles.sectionTitle}>Receita por Forma de Pagamento</Text>
            {paymentData.length === 0 ? (
              <Text style={[styles.bodyText, { marginTop: 8 }]}>Nenhum pagamento registrado nesta data.</Text>
            ) : (
              paymentData.map((item, index) => {
                const totalReceita = report.receita > 0 ? report.receita : 1;
                const percent = Math.min(100, Math.round((item.total / totalReceita) * 100));
                return (
                  <View key={`${item.name}-${index}`} style={{ marginTop: 12 }}>
                    <View style={styles.row}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                        <CreditCard color={colors.primary} size={18} />
                        <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                          {item.name}
                        </Text>
                      </View>
                      <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 15 }}>
                        {formatCurrency(item.total)} ({percent}%)
                      </Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: colors.muted, borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
                      <View
                        style={{
                          width: `${percent}%`,
                          height: "100%",
                          backgroundColor: colors.chart[index % colors.chart.length],
                          borderRadius: 3,
                        }}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </Panel>
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
}: {
  title: string;
  value: string;
  color: string;
  icon: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Panel style={{ marginBottom: 0 }}>
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

export default function ReportsScreen() {
  return (
    <AuthGate managerOnly>
      <ReportsContent />
    </AuthGate>
  );
}
