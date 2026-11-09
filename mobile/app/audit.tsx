import { useCallback, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ActionButton } from "../src/components/ActionButton";
import { AppScreen } from "../src/components/AppScreen";
import { AuthGate } from "../src/components/AuthGate";
import { Message } from "../src/components/Message";
import { Panel } from "../src/components/Panel";
import { EmptyState, LoadingState } from "../src/components/ResourceStatus";
import { useTheme } from "../src/contexts/ThemeContext";
import { listSystemLogs, type SystemLogDto } from "../src/services/api";

const PAGE_SIZE = 25;

function AuditContent() {
  const { colors, styles } = useTheme();
  const [logs, setLogs] = useState<SystemLogDto[]>([]);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (targetPage: number, filterQuery: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const data = await listSystemLogs(targetPage, PAGE_SIZE, filterQuery);
      setLogs(Array.isArray(data) ? data : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar os logs de auditoria.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(page, activeFilter);
    }, [activeFilter, load, page]),
  );

  const handleSearch = () => {
    setPage(1);
    setActiveFilter(searchInput.trim());
  };

  const handleClear = () => {
    setSearchInput("");
    setActiveFilter("");
    setPage(1);
  };

  return (
    <AppScreen
      title="Auditoria"
      subtitle="Histórico de ações e eventos do sistema."
      refreshing={refreshing}
      onRefresh={() => void load(page, activeFilter, true)}
      safeArea
    >
      <ActionButton
        title="Voltar ao Início"
        variant="secondary"
        onPress={() => router.back()}
        style={{ marginBottom: 12 }}
      />

      <Panel>
        <Text style={styles.sectionTitle}>Filtrar Logs</Text>
        <TextInput
          accessibilityLabel="Filtrar ação, detalhes ou usuário"
          placeholder="Filtrar ação, detalhes ou usuário..."
          placeholderTextColor={colors.mutedForeground}
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={handleSearch}
          style={styles.input}
        />
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <ActionButton
            title="Buscar"
            onPress={handleSearch}
            style={{ flex: 1 }}
          />
          {activeFilter ? (
            <ActionButton
              title="Limpar"
              variant="secondary"
              onPress={handleClear}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
      </Panel>

      {error ? <Message kind="error" text={error} /> : null}
      {loading && logs.length === 0 ? <LoadingState label="Carregando logs de auditoria..." /> : null}
      {!loading && logs.length === 0 ? (
        <EmptyState
          text={
            activeFilter
              ? "Nenhum log encontrado para o filtro aplicado."
              : "Nenhum log registrado no sistema."
          }
        />
      ) : null}

      <FlatList
        data={logs}
        keyExtractor={(item) => String(item.idLogSistema)}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <Panel key={item.idLogSistema}>
            <View style={styles.row}>
              <View
                style={{
                  backgroundColor: colors.primarySoft,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                  {item.tipoLog}
                </Text>
              </View>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                {new Date(item.dataLog).toLocaleString("pt-BR")}
              </Text>
            </View>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 14, marginTop: 8 }}>
              {item.descricaoLog}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 6 }}>
              Usuário: {item.usuarioLog || "Sistema"}
            </Text>
          </Panel>
        )}
      />

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 20 }}>
        <ActionButton
          title="Anterior"
          variant="secondary"
          disabled={page <= 1 || loading}
          onPress={() => setPage((p) => Math.max(1, p - 1))}
          style={{ minWidth: 100 }}
        />
        <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
          Página {page}
        </Text>
        <ActionButton
          title="Próxima"
          variant="secondary"
          disabled={logs.length < PAGE_SIZE || loading}
          onPress={() => setPage((p) => p + 1)}
          style={{ minWidth: 100 }}
        />
      </View>
    </AppScreen>
  );
}

export default function AuditScreen() {
  return (
    <AuthGate managerOnly>
      <AuditContent />
    </AuthGate>
  );
}
