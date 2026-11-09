import { useCallback } from "react";
import { Text, View } from "react-native";
import { AuthGate } from "../../src/components/AuthGate";
import { AppScreen } from "../../src/components/AppScreen";
import { Message } from "../../src/components/Message";
import { Panel } from "../../src/components/Panel";
import { EmptyState, LoadingState } from "../../src/components/ResourceStatus";
import { useCachedResource } from "../../src/hooks/useCachedResource";
import { formatCurrency } from "../../src/lib/format";
import { listProducts } from "../../src/services/api";
import type { ProductDto } from "../../src/types/api";
import { colors } from "../../src/theme/colors";
import { styles } from "../../src/theme/styles";

function ProductList() {
  const loadProducts = useCallback(() => listProducts(), []);
  const resource = useCachedResource<ProductDto[]>("products", loadProducts);
  const products = resource.data ?? [];

  return (
    <AppScreen
      title="Produtos e estoque"
      subtitle="Consulta de produtos e quantidades disponíveis."
      refreshing={resource.refreshing}
      onRefresh={() => void resource.refresh()}
    >
      {resource.error ? <Message kind="error" text={resource.error} /> : null}
      {resource.cacheWarning ? <Message kind="info" text={resource.cacheWarning} /> : null}
      {resource.loading && !resource.data ? <LoadingState label="Carregando produtos..." /> : null}
      {!resource.loading && products.length === 0 ? <EmptyState text="Nenhum produto encontrado." /> : null}
      {products.map((product) => {
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
            <Text
              accessibilityLabel={`Estoque ${product.qtdEstoque}, mínimo ${product.estoqueMinimo}`}
              style={{
                color: lowStock ? colors.warning : colors.success,
                fontFamily: "Inter_600SemiBold",
                marginTop: 8,
              }}
            >
              Estoque: {product.qtdEstoque} · mínimo {product.estoqueMinimo}
              {lowStock ? " · Estoque baixo" : ""}
            </Text>
          </Panel>
        );
      })}
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
