import { useCallback, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { AuthGate } from "../../src/components/AuthGate";
import { ActionButton } from "../../src/components/ActionButton";
import { AppScreen } from "../../src/components/AppScreen";
import { Message } from "../../src/components/Message";
import { Panel } from "../../src/components/Panel";
import { EmptyState, LoadingState } from "../../src/components/ResourceStatus";
import {
  addComandaItem,
  closeComanda,
  getComanda,
  listPaymentForms,
  listProducts,
  payComanda,
  removeComandaItem,
} from "../../src/services/api";
import type { CommandDto, PaymentFormDto, ProductDto } from "../../src/types/api";
import { formatCurrency } from "../../src/lib/format";
import { useTheme } from "../../src/contexts/ThemeContext";

function ComandaDetailContent() {
  const { colors, styles } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const commandId = Number(id);
  const [command, setCommand] = useState<CommandDto | null>(null);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [paymentForms, setPaymentForms] = useState<PaymentFormDto[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [current, availableProducts, forms] = await Promise.all([
        getComanda(commandId),
        listProducts(),
        listPaymentForms(),
      ]);
      setCommand(current);
      setProducts(availableProducts);
      setPaymentForms(forms);
      setSelectedPayment((selected) => selected ?? forms[0]?.idFormaPagamento ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar a comanda.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [commandId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const isOpen = command?.statusComanda?.toUpperCase() === "ABERTA";

  const handleAddItem = (product: ProductDto) => {
    Alert.alert("Adicionar item", `Adicionar 1 × ${product.nomeProduto} à comanda?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Adicionar",
        onPress: () => {
          setWorking(true);
          void addComandaItem(commandId, {
            idProduto: product.idProduto,
            qtdProduto: 1,
            precoUnitarioPago: Number(product.precoProduto),
          })
            .then(() => load(true))
            .catch((reason: unknown) =>
              Alert.alert("Não foi possível adicionar", reason instanceof Error ? reason.message : "Falha na API."),
            )
            .finally(() => setWorking(false));
        },
      },
    ]);
  };

  const handleRemoveItem = (itemId: number, itemName: string) => {
    Alert.alert("Remover item", `Remover ${itemName} da comanda?`, [
      { text: "Manter", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          setWorking(true);
          void removeComandaItem(commandId, itemId)
            .then(() => load(true))
            .catch((reason: unknown) =>
              Alert.alert("Não foi possível remover", reason instanceof Error ? reason.message : "Falha na API."),
            )
            .finally(() => setWorking(false));
        },
      },
    ]);
  };

  const handlePay = () => {
    if (selectedPayment === null) {
      Alert.alert("Forma de pagamento", "A API não retornou formas de pagamento.");
      return;
    }
    Alert.alert("Pagar comanda", "O pagamento também fecha a comanda e libera a mesa.", [
      { text: "Voltar", style: "cancel" },
      {
        text: "Pagar e fechar",
        onPress: () => {
          setWorking(true);
          void payComanda(commandId, selectedPayment)
            .then(() => load(true))
            .catch((reason: unknown) =>
              Alert.alert("Não foi possível pagar", reason instanceof Error ? reason.message : "Falha na API."),
            )
            .finally(() => setWorking(false));
        },
      },
    ]);
  };

  const handleClose = () => {
    Alert.alert(
      "Encerrar comanda",
      "A API registra este encerramento como pagamento na forma cadastrada com ID 1. Deseja continuar?",
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Encerrar",
          style: "destructive",
          onPress: () => {
            setWorking(true);
            void closeComanda(commandId)
              .then(() => load(true))
              .catch((reason: unknown) =>
                Alert.alert("Não foi possível encerrar", reason instanceof Error ? reason.message : "Falha na API."),
              )
              .finally(() => setWorking(false));
          },
        },
      ],
    );
  };

  if (!Number.isInteger(commandId) || commandId <= 0) {
    return (
      <AppScreen title="Comanda" safeArea>
        <Message kind="error" text="Identificador de comanda inválido." />
        <ActionButton title="Voltar" onPress={() => router.back()} />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      title={`Comanda #${commandId}`}
      subtitle={command ? `Mesa ${command.mesa?.numeroMesa ?? command.numeroMesa ?? command.idMesa}` : undefined}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      safeArea
    >
      <ActionButton title="Voltar" variant="secondary" onPress={() => router.back()} style={{ marginBottom: 12 }} />
      {error ? <Message kind="error" text={error} /> : null}
      {loading && !command ? <LoadingState label="Carregando comanda..." /> : null}
      {command ? (
        <>
          <Panel>
            <View style={styles.row}>
              <Text style={styles.sectionTitle}>Status</Text>
              <Text style={{ color: isOpen ? colors.success : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }}>
                {command.statusComanda}
              </Text>
            </View>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
              Aberta em {new Date(command.dataAberta).toLocaleString("pt-BR")}
            </Text>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 20, marginTop: 12 }}>
              Total: {formatCurrency(command.valorTotal)}
            </Text>
          </Panel>

          <Text style={styles.sectionTitle}>Itens da comanda</Text>
          {(command.itensComanda ?? []).length === 0 ? <EmptyState text="Esta comanda ainda não tem itens." /> : null}
          {(command.itensComanda ?? []).map((item) => {
            const name = item.produto?.nomeProduto ?? item.nomeProduto ?? `Produto ${item.idProduto}`;
            return (
              <Panel key={item.idItemComanda}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>{name}</Text>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 5 }}>
                      {item.qtdProduto} × {formatCurrency(item.precoUnitarioPago)} · {item.statusItem ?? "Sem status"}
                    </Text>
                  </View>
                  {isOpen ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remover ${name} da comanda`}
                      disabled={working}
                      onPress={() => handleRemoveItem(item.idItemComanda, name)}
                      style={{ backgroundColor: colors.destructiveSoft, borderRadius: 8, padding: 10 }}
                    >
                      <Text style={{ color: colors.destructive, fontFamily: "Inter_600SemiBold" }}>Remover</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Panel>
            );
          })}

          {isOpen ? (
            <>
              <Text style={styles.sectionTitle}>Adicionar produto</Text>
              {products.filter((product) => product.qtdEstoque > 0 && product.precoProduto > 0 && product.statusProduto?.toUpperCase() === "DISPONIVEL").length === 0 ? (
                <EmptyState text="Nenhum produto disponível em estoque." />
              ) : null}
              {products
                .filter((product) => product.qtdEstoque > 0 && product.precoProduto > 0 && product.statusProduto?.toUpperCase() === "DISPONIVEL")
                .map((product) => (
                  <Panel key={product.idProduto}>
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                          {product.nomeProduto}
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 4 }}>
                          {formatCurrency(product.precoProduto)} · estoque {product.qtdEstoque}
                        </Text>
                      </View>
                      <ActionButton
                        title="Adicionar"
                        onPress={() => handleAddItem(product)}
                        disabled={working}
                        style={{ minWidth: 112 }}
                      />
                    </View>
                  </Panel>
                ))}

              <Text style={styles.sectionTitle}>Pagamento</Text>
              {paymentForms.map((form) => {
                const selected = selectedPayment === form.idFormaPagamento;
                return (
                  <Pressable
                    key={form.idFormaPagamento}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`Forma de pagamento ${form.nomeFormaPagamento}`}
                    onPress={() => setSelectedPayment(form.idFormaPagamento)}
                    style={{
                      minHeight: 50,
                      marginBottom: 8,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: selected ? colors.primary : colors.border,
                      borderRadius: 10,
                      backgroundColor: selected ? colors.primarySoft : colors.card,
                    }}
                  >
                    <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
                      {selected ? "● " : "○ "}{form.nomeFormaPagamento}
                    </Text>
                  </Pressable>
                );
              })}
              {paymentForms.length === 0 ? (
                <EmptyState text="Nenhuma forma de pagamento cadastrada." />
              ) : null}
              <ActionButton
                title="Pagar e fechar comanda"
                onPress={handlePay}
                disabled={working || paymentForms.length === 0}
                loading={working}
                style={{ marginTop: 6 }}
              />
              <ActionButton
                title="Encerrar pela forma de pagamento #1"
                variant="secondary"
                onPress={handleClose}
                disabled={working}
                style={{ marginTop: 10 }}
              />
            </>
          ) : null}
        </>
      ) : null}
    </AppScreen>
  );
}

export default function ComandaDetailScreen() {
  return (
    <AuthGate>
      <ComandaDetailContent />
    </AuthGate>
  );
}
