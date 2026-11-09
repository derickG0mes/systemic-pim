import { useCallback, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ActionButton } from "../../src/components/ActionButton";
import { AuthGate } from "../../src/components/AuthGate";
import { AppScreen } from "../../src/components/AppScreen";
import { Message } from "../../src/components/Message";
import { Panel } from "../../src/components/Panel";
import { EmptyState, LoadingState } from "../../src/components/ResourceStatus";
import { useCachedResource } from "../../src/hooks/useCachedResource";
import { formatCurrency } from "../../src/lib/format";
import { adjustProductStock, createProduct, listProducts } from "../../src/services/api";
import type { ProductDto } from "../../src/types/api";
import { useTheme } from "../../src/contexts/ThemeContext";

const CATEGORIES = ["Todas", "Carnes", "Peixes", "Massas", "Bebidas", "Sobremesas", "Saladas", "Entradas"];

function ProductList() {
  const { colors, styles } = useTheme();
  const loadProducts = useCallback(() => listProducts(), []);
  const resource = useCachedResource<ProductDto[]>("products", loadProducts);
  const products = useMemo(() => resource.data ?? [], [resource.data]);

  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Novo Produto
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Bebidas");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newMinStock, setNewMinStock] = useState("5");
  const [savingProduct, setSavingProduct] = useState(false);
  const [createError, setCreateError] = useState("");

  // Modal Ajuste Estoque
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<ProductDto | null>(null);
  const [adjustType, setAdjustType] = useState<"ADICIONAR" | "REMOVER">("ADICIONAR");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [savingAdjust, setSavingAdjust] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const cat = product.categoria ?? product.categoriaProduto ?? "";
      if (selectedCategory !== "Todas" && cat.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        return product.nomeProduto.toLowerCase().includes(query) || cat.toLowerCase().includes(query);
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleCreateProduct = async () => {
    setCreateError("");
    if (!newName.trim() || !newPrice.trim() || !newStock.trim()) {
      setCreateError("Informe o nome, preço e estoque inicial.");
      return;
    }
    const priceNum = parseFloat(newPrice.replace(",", "."));
    const stockNum = parseInt(newStock, 10);
    const minStockNum = parseInt(newMinStock, 10) || 5;

    if (isNaN(priceNum) || priceNum <= 0) {
      setCreateError("Preço inválido.");
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setCreateError("Estoque inicial inválido.");
      return;
    }

    setSavingProduct(true);
    try {
      await createProduct({
        nomeProduto: newName.trim(),
        categoria: newCategory,
        categoriaProduto: newCategory,
        precoProduto: priceNum,
        qtdEstoque: stockNum,
        estoqueMinimo: minStockNum,
        statusProduto: "DISPONIVEL",
      });
      setNewName("");
      setNewPrice("");
      setNewStock("");
      setNewMinStock("5");
      setCreateModalVisible(false);
      await resource.refresh();
      Alert.alert("Sucesso", "Produto cadastrado com sucesso.");
    } catch (reason) {
      setCreateError(reason instanceof Error ? reason.message : "Não foi possível cadastrar o produto.");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleOpenAdjust = (product: ProductDto) => {
    setAdjustProduct(product);
    setAdjustType("ADICIONAR");
    setAdjustQuantity("");
    setAdjustReason("");
    setAdjustError("");
    setAdjustModalVisible(true);
  };

  const handleConfirmAdjust = async () => {
    if (!adjustProduct) return;
    setAdjustError("");
    const qty = parseInt(adjustQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setAdjustError("Informe uma quantidade válida e positiva.");
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError("Informe o motivo do ajuste.");
      return;
    }

    setSavingAdjust(true);
    try {
      await adjustProductStock(adjustProduct.idProduto, {
        tipo: adjustType,
        quantidade: qty,
        motivo: adjustReason.trim(),
      });
      setAdjustModalVisible(false);
      await resource.refresh();
      Alert.alert("Sucesso", "Estoque ajustado com sucesso.");
    } catch (reason) {
      setAdjustError(reason instanceof Error ? reason.message : "Não foi possível ajustar o estoque.");
    } finally {
      setSavingAdjust(false);
    }
  };

  return (
    <AppScreen
      title="Produtos e estoque"
      subtitle="Consulta, cadastro e ajuste de estoque."
      refreshing={resource.refreshing}
      onRefresh={() => void resource.refresh()}
    >
      <ActionButton
        title="Novo Produto"
        onPress={() => {
          setCreateError("");
          setCreateModalVisible(true);
        }}
        style={{ marginBottom: 12 }}
      />

      <TextInput
        accessibilityLabel="Buscar produtos por nome ou categoria"
        placeholder="Buscar por nome ou categoria..."
        placeholderTextColor={colors.mutedForeground}
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={[styles.input, { marginBottom: 10 }]}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {CATEGORIES.map((cat) => (
            <ActionButton
              key={cat}
              title={cat}
              variant={selectedCategory === cat ? "primary" : "secondary"}
              onPress={() => setSelectedCategory(cat)}
              style={{ minWidth: 60 }}
            />
          ))}
        </View>
      </ScrollView>

      {resource.error ? <Message kind="error" text={resource.error} /> : null}
      {resource.cacheWarning ? <Message kind="info" text={resource.cacheWarning} /> : null}
      {resource.loading && !resource.data ? <LoadingState label="Carregando produtos..." /> : null}
      {!resource.loading && filteredProducts.length === 0 ? (
        <EmptyState
          text={
            searchQuery.trim() || selectedCategory !== "Todas"
              ? "Nenhum produto encontrado com os filtros aplicados."
              : "Nenhum produto encontrado."
          }
        />
      ) : null}

      {filteredProducts.map((product) => {
        const lowStock = product.qtdEstoque <= product.estoqueMinimo;
        return (
          <Panel key={product.idProduto}>
            <View style={styles.row}>
              <Text style={{ flex: 1, color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 17 }}>
                {product.nomeProduto}
              </Text>
              <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 16 }}>
                {formatCurrency(product.precoProduto)}
              </Text>
            </View>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 7 }}>
              {product.categoria ?? product.categoriaProduto ?? "Sem categoria"}
            </Text>
            <View style={[styles.row, { marginTop: 8 }]}>
              <Text
                accessibilityLabel={`Estoque ${product.qtdEstoque}, mínimo ${product.estoqueMinimo}`}
                style={{
                  color: lowStock ? colors.warning : colors.success,
                  fontFamily: "Inter_600SemiBold",
                  flex: 1,
                }}
              >
                Estoque: {product.qtdEstoque} · mínimo {product.estoqueMinimo}
                {lowStock ? " · Estoque baixo" : ""}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ajustar estoque de ${product.nomeProduto}`}
                onPress={() => handleOpenAdjust(product)}
                style={{
                  backgroundColor: colors.primarySoft,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                  Ajustar Estoque
                </Text>
              </Pressable>
            </View>
          </Panel>
        );
      })}

      {/* Modal Criar Produto */}
      <Modal visible={createModalVisible} animationType="slide" transparent onRequestClose={() => setCreateModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 16 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, maxHeight: "90%" }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sectionTitle, { fontSize: 20, marginBottom: 12 }]}>Novo Produto</Text>

              <Text style={styles.fieldLabel}>Nome do produto</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Ex.: Hambúrguer Artesanal"
                placeholderTextColor={colors.mutedForeground}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {CATEGORIES.filter((c) => c !== "Todas").map((cat) => (
                    <ActionButton
                      key={cat}
                      title={cat}
                      variant={newCategory === cat ? "primary" : "secondary"}
                      onPress={() => setNewCategory(cat)}
                      style={{ minWidth: 60 }}
                    />
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.fieldLabel}>Preço (R$)</Text>
              <TextInput
                value={newPrice}
                onChangeText={setNewPrice}
                placeholder="Ex.: 32.50"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Estoque Inicial</Text>
              <TextInput
                value={newStock}
                onChangeText={setNewStock}
                placeholder="Ex.: 20"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Estoque Mínimo</Text>
              <TextInput
                value={newMinStock}
                onChangeText={setNewMinStock}
                placeholder="Ex.: 5"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                style={styles.input}
              />

              {createError ? <Message kind="error" text={createError} /> : null}

              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <ActionButton
                  title="Cancelar"
                  variant="secondary"
                  onPress={() => setCreateModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <ActionButton
                  title="Cadastrar"
                  onPress={() => void handleCreateProduct()}
                  loading={savingProduct}
                  disabled={savingProduct}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Ajustar Estoque */}
      <Modal visible={adjustModalVisible} animationType="slide" transparent onRequestClose={() => setAdjustModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 16 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20 }}>
            <Text style={[styles.sectionTitle, { fontSize: 20, marginBottom: 4 }]}>Ajustar Estoque</Text>
            <Text style={[styles.bodyText, { color: colors.mutedForeground, marginBottom: 14 }]}>
              {adjustProduct?.nomeProduto} · Atual: {adjustProduct?.qtdEstoque}
            </Text>

            <Text style={styles.fieldLabel}>Tipo de ajuste</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <ActionButton
                title="Adicionar (+)"
                variant={adjustType === "ADICIONAR" ? "primary" : "secondary"}
                onPress={() => setAdjustType("ADICIONAR")}
                style={{ flex: 1 }}
              />
              <ActionButton
                title="Remover (-)"
                variant={adjustType === "REMOVER" ? "danger" : "secondary"}
                onPress={() => setAdjustType("REMOVER")}
                style={{ flex: 1 }}
              />
            </View>

            <Text style={styles.fieldLabel}>Quantidade</Text>
            <TextInput
              value={adjustQuantity}
              onChangeText={setAdjustQuantity}
              placeholder="Ex.: 5"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Motivo do ajuste</Text>
            <TextInput
              value={adjustReason}
              onChangeText={setAdjustReason}
              placeholder="Ex.: Reposição de fornecedor ou perda"
              placeholderTextColor={colors.mutedForeground}
              style={styles.input}
            />

            {adjustError ? <Message kind="error" text={adjustError} /> : null}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <ActionButton
                title="Cancelar"
                variant="secondary"
                onPress={() => setAdjustModalVisible(false)}
                style={{ flex: 1 }}
              />
              <ActionButton
                title="Confirmar"
                onPress={() => void handleConfirmAdjust()}
                loading={savingAdjust}
                disabled={savingAdjust}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

export default function ProductsScreen() {
  return (
    <AuthGate managerOnly>
      <ProductList />
    </AuthGate>
  );
}
