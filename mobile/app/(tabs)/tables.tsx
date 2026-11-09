import { useCallback } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ActionButton } from "../../src/components/ActionButton";
import { AppScreen } from "../../src/components/AppScreen";
import { Message } from "../../src/components/Message";
import { Panel } from "../../src/components/Panel";
import { EmptyState, LoadingState } from "../../src/components/ResourceStatus";
import { useCachedResource } from "../../src/hooks/useCachedResource";
import { formatCurrency } from "../../src/lib/format";
import { openComanda, listComandas, listOpenComandas, listTables } from "../../src/services/api";
import type { CommandDto, TableDto } from "../../src/types/api";
import { useTheme } from "../../src/contexts/ThemeContext";

interface TableAndCommandData {
  tables: TableDto[];
  commands: CommandDto[];
  allCommands: CommandDto[];
}

export default function TablesScreen() {
  const { colors, styles } = useTheme();
  const loadTables = useCallback(async () => {
    const [tables, commands, allCommands] = await Promise.all([
      listTables(),
      listOpenComandas(),
      listComandas(),
    ]);
    return { tables, commands, allCommands } satisfies TableAndCommandData;
  }, []);
  const resource = useCachedResource("tables-and-open-comandas", loadTables);
  const data = resource.data;

  const handleOpen = (table: TableDto) => {
    Alert.alert("Abrir comanda", `Abrir uma comanda para a Mesa ${table.numeroMesa}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Abrir",
        onPress: () => {
          void openComanda(table.idMesa)
            .then(() => resource.refresh())
            .catch((error: unknown) =>
              Alert.alert("Não foi possível abrir", error instanceof Error ? error.message : "Falha na API."),
            );
        },
      },
    ]);
  };

  const openCommandForTable = (table: TableDto) =>
    data?.commands.find(
      (command) =>
        command.idMesa === table.idMesa ||
        command.numeroMesa === table.numeroMesa ||
        command.mesa?.numeroMesa === table.numeroMesa,
    );

  return (
    <AppScreen
      title="Mesas e comandas"
      subtitle="Acompanhe as mesas e abra ou consulte comandas."
      refreshing={resource.refreshing}
      onRefresh={() => void resource.refresh()}
    >
      {resource.error ? <Message kind="error" text={resource.error} /> : null}
      {resource.cacheWarning ? <Message kind="info" text={resource.cacheWarning} /> : null}
      {resource.loading && !data ? <LoadingState label="Carregando mesas..." /> : null}
      {data && data.tables.length === 0 ? <EmptyState text="Nenhuma mesa cadastrada." /> : null}
      {data?.tables.map((table) => {
        const command = openCommandForTable(table);
        const tableNumber = table.numeroMesa;
        const commandAccessibilityLabel = command
          ? `Mesa ${tableNumber}, comanda aberta número ${command.idComanda}, total ${formatCurrency(command.valorTotal)}. Capacidade ${table.capacidadeMesa ?? "não informada"}.`
          : undefined;
        return (
          <Pressable
            key={table.idMesa}
            accessible={Boolean(command)}
            accessibilityRole={command ? "button" : undefined}
            accessibilityLabel={commandAccessibilityLabel}
            accessibilityHint={command ? "Toque duas vezes para abrir os detalhes da comanda." : undefined}
            onPress={
              command
                ? () => router.push({ pathname: "/comanda/[id]", params: { id: String(command.idComanda) } })
                : undefined
            }
          >
            <Panel>
              <View style={styles.row}>
                <View>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 19 }}>
                    Mesa {tableNumber}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 3 }}>
                    {table.capacidadeMesa ? `Capacidade: ${table.capacidadeMesa}` : "Mesa cadastrada"}
                  </Text>
                </View>
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  style={{
                    backgroundColor: command ? colors.successSoft : colors.secondary,
                    borderRadius: 16,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: command ? colors.success : colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                    {command ? "Aberta" : "Livre"}
                  </Text>
                </View>
              </View>
              {command ? (
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 12 }}>
                  Comanda #{command.idComanda} · {formatCurrency(command.valorTotal)}
                </Text>
              ) : (
                <ActionButton
                  title="Abrir comanda"
                  onPress={() => handleOpen(table)}
                  style={{ marginTop: 12 }}
                />
              )}
            </Panel>
          </Pressable>
        );
      })}
      <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Comandas recentes</Text>
      {(data?.allCommands ?? [])
        .filter((command) => command.statusComanda?.toUpperCase() !== "ABERTA")
        .sort((a, b) => new Date(b.dataAberta).getTime() - new Date(a.dataAberta).getTime())
        .slice(0, 10)
        .map((command) => {
          const tableNumber = command.mesa?.numeroMesa ?? command.numeroMesa ?? command.idMesa;
          return (
            <Pressable
              key={command.idComanda}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Mesa ${tableNumber}, comanda número ${command.idComanda}, status ${command.statusComanda}, total ${formatCurrency(command.valorTotal)}.`}
              accessibilityHint="Toque duas vezes para abrir os detalhes da comanda."
              onPress={() => router.push({ pathname: "/comanda/[id]", params: { id: String(command.idComanda) } })}
            >
              <Panel>
                <View style={styles.row}>
                  <View>
                    <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 16 }}>
                      Mesa {tableNumber} · Comanda #{command.idComanda}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 5 }}>
                      {command.statusComanda} · {formatCurrency(command.valorTotal)}
                    </Text>
                  </View>
                  <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                    Detalhes
                  </Text>
                </View>
              </Panel>
            </Pressable>
          );
        })}
      {!resource.loading &&
      (data?.allCommands ?? []).filter((command) => command.statusComanda?.toUpperCase() !== "ABERTA").length === 0 ? (
        <EmptyState text="Ainda não há comandas encerradas." />
      ) : null}
    </AppScreen>
  );
}
