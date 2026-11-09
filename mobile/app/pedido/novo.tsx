import { useCallback, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { AuthGate } from "../../src/components/AuthGate";
import { ActionButton } from "../../src/components/ActionButton";
import { AppScreen } from "../../src/components/AppScreen";
import { Message } from "../../src/components/Message";
import { Panel } from "../../src/components/Panel";
import { EmptyState, LoadingState } from "../../src/components/ResourceStatus";
import { useCachedResource } from "../../src/hooks/useCachedResource";
import { formatCurrency } from "../../src/lib/format";
import { createOrder, listOpenComandas, listProducts } from "../../src/services/api";
import type { CommandDto, ProductDto } from "../../src/types/api";
import { colors } from "../../src/theme/colors";
import { styles } from "../../src/theme/styles";

function NewOrderContent() {
  const loadCommands = useCallback(() => listOpenComandas(), []);
  const loadProducts = useCallback(() => listProducts(), []);
  const commands = useCachedResource<CommandDto[]>("open-comandas", loadCommands);
  const products = useCachedResource<ProductDto[]>("products", loadProducts);
  const [selectedCommandId, setSelectedCommandId] = useState<number | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  const selectedCommand = (commands.data ?? []).find((item) => item.idComanda === selectedCommandId);
  const selectedProducts = (products.data ?? []).filter((item) => (cart[item.idProduto] ?? 0) > 0);
  const availableProducts = (products.data ?? []).filter(
    (product) =>
      product.qtdEstoque > 0 &&
      product.precoProduto > 0 &&
      product.statusProduto?.toUpperCase() === "DISPONIVEL",
  );
  const total = selectedProducts.reduce(
    (sum, product) => sum + product.precoProduto * (cart[product.idProduto] ?? 0),
    0,
  );

  const setQuantity = (productId: number, delta: number) => {
    setCart((current) => {
      const quantity = Math.max(0, (current[productId] ?? 0) + delta);
      if (quantity === 0) {
        const { [productId]: _removed, ...remaining } = current;
        return remaining;
      }
      return { ...current, [productId]: quantity };
    });
  };

  const submit = async () => {
    if (!selectedCommand) {
      Alert.alert("Mesa obrigatória", "Selecione uma mesa com comanda aberta.");
      return;
    }
    if (selectedProducts.length === 0) {
      Alert.alert("Pedido vazio", "Adicione ao menos um produto.");
      return;
    }
    const stockIssue = selectedProducts.find((product) => cart[product.idProduto] > product.qtdEstoque);
    if (stockIssue) {
      Alert.alert("Estoque insuficiente", `Disponível de ${stockIssue.nomeProduto}: ${stockIssue.qtdEstoque}.`);
      return;
    }

    setSaving(true);
    try {
      await createOrder(
        selectedCommand.idMesa,
        selectedProducts.map((product) => ({
          idProduto: product.idProduto,
          qtdProduto: cart[product.idProduto],
          precoUnitarioPago: Number(product.precoProduto),
        })),
      );
      await Promise.all([commands.refresh(), products.refresh()]);
      Alert.alert("Pedido enviado", "O pedido foi adicionado à comanda aberta.");
      router.back();
    } catch (reason) {
      Alert.alert("Não foi possível criar o pedido", reason instanceof Error ? reason.message : "Falha na API.");
    } finally {
      setSaving(false);
    }
  };

  const refresh = () => {
    void commands.refresh();
    void products.refresh();
  };

  return (
    <AppScreen
      title="Novo pedido"
      subtitle="Escolha uma comanda aberta e adicione itens disponíveis."
      refreshing={commands.refreshing || products.refreshing}
      onRefresh={refresh}
      safeArea
    >
      <ActionButton title="Voltar" variant="secondary" onPress={() => router.back()} style={{ marginBottom: 12 }} />
      {commands.error ? <Message kind="error" text={commands.error} /> : null}
      {products.error ? <Message kind="error" text={products.error} /> : null}
      {commands.loading && !commands.data ? <LoadingState label="Carregando comandas abertas..." /> : null}

      <Text style={styles.sectionTitle}>Mesa com comanda aberta</Text>
      {(commands.data ?? []).length === 0 ? (
        <EmptyState text="Não há comandas abertas. Abra uma comanda na tela Mesas antes de criar um pedido." />
      ) : null}
      {(commands.data ?? []).map((command) => {
        const mesa = command.mesa?.numeroMesa ?? command.numeroMesa ?? command.idMesa;
        const selected = selectedCommandId === command.idComanda;
        return (
          <Pressable
            key={command.idComanda}
            accessible
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`Mesa ${mesa}, comanda aberta número ${command.idComanda}, total ${formatCurrency(command.valorTotal)}`}
            accessibilityHint="Toque duas vezes para selecionar esta comanda."
            onPress={() => setSelectedCommandId(command.idComanda)}
          >
            <Panel style={{ borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.card }}>
              <View style={styles.row}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 17 }}>
                  Mesa {mesa}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>
                  {selected ? "Selecionada" : `Comanda #${command.idComanda}`}
                </Text>
              </View>
            </Panel>
          </Pressable>
        );
      })}

      <Text style={styles.sectionTitle}>Produtos</Text>
      {products.loading && !products.data ? <LoadingState label="Carregando produtos..." /> : null}
      {!products.loading && availableProducts.length === 0 ? (
        <EmptyState text="Nenhum produto disponível em estoque." />
      ) : null}
      {availableProducts.map((product) => (
          <Panel key={product.idProduto}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
                  {product.nomeProduto}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 5 }}>
                  {formatCurrency(product.precoProduto)} · estoque {product.qtdEstoque}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Diminuir ${product.nomeProduto}`}
                  onPress={() => setQuantity(product.idProduto, -1)}
                  style={{ minWidth: 42, minHeight: 42, alignItems: "center", justifyContent: "center", backgroundColor: colors.secondary, borderRadius: 9 }}
                >
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 20 }}>−</Text>
                </Pressable>
                <Text accessibilityLabel={`Quantidade ${cart[product.idProduto] ?? 0}`} style={{ color: colors.foreground, fontFamily: "Inter_700Bold", minWidth: 20, textAlign: "center" }}>
                  {cart[product.idProduto] ?? 0}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Adicionar ${product.nomeProduto}`}
                  disabled={(cart[product.idProduto] ?? 0) >= product.qtdEstoque}
                  onPress={() => setQuantity(product.idProduto, 1)}
                  style={{ minWidth: 42, minHeight: 42, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, borderRadius: 9, opacity: (cart[product.idProduto] ?? 0) >= product.qtdEstoque ? 0.45 : 1 }}
                >
                  <Text style={{ color: colors.white, fontFamily: "Inter_700Bold", fontSize: 20 }}>+</Text>
                </Pressable>
              </View>
            </View>
          </Panel>
        ))}

      {selectedProducts.length > 0 ? (
        <Panel>
          <Text style={styles.sectionTitle}>Resumo do pedido</Text>
          {selectedProducts.map((product) => (
            <Text key={product.idProduto} style={[styles.bodyText, { marginBottom: 7 }]}>
              {cart[product.idProduto]} × {product.nomeProduto}
            </Text>
          ))}
          <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 19, marginTop: 4 }}>
            Total: {formatCurrency(total)}
          </Text>
        </Panel>
      ) : null}
      <ActionButton
        title={saving ? "Enviando..." : "Enviar pedido"}
        onPress={() => void submit()}
        disabled={saving || !selectedCommand || selectedProducts.length === 0}
        loading={saving}
        style={{ marginBottom: 20 }}
      />
    </AppScreen>
  );
}

export default function NewOrderScreen() {
  return (
    <AuthGate>
      <NewOrderContent />
    </AuthGate>
  );
}
