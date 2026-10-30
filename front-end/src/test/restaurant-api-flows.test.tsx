import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RestaurantProvider } from "@/contexts/RestaurantContext";
import { useRestaurant } from "@/contexts/useRestaurant";
import {
  createComanda,
  createPedido,
  pagarComanda,
  updatePedidoStatus,
} from "@/services/api";

const database = vi.hoisted(() => ({
  comandas: [] as Array<Record<string, unknown>>,
  products: [] as Array<Record<string, unknown>>,
  nextComandaId: 100,
}));

vi.mock("@/hooks/useSignalR", () => ({
  useSignalR: () => ({ connected: false, enabled: false }),
}));

vi.mock("@/contexts/useAuth", () => ({
  useAuth: () => ({ user: { name: "Teste" } }),
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    createPedido: vi.fn(async (payload: { idMesa: number; itens: Array<Record<string, number>> }) => {
      const tab = database.comandas.find(
        (comanda) => comanda.idMesa === payload.idMesa && comanda.statusComanda === "ABERTA",
      );
      if (!tab) throw new Error("Comanda aberta não encontrada");
      const items = tab.itensComanda as Array<Record<string, unknown>>;
      payload.itens.forEach((item) => {
        const product = database.products.find(
          (entry) => entry.idProduto === item.idProduto,
        );
        if (product) product.qtdEstoque = Number(product.qtdEstoque) - item.qtdProduto;
        items.push({
          idProduto: item.idProduto,
          nomeProduto: "Prato do dia",
          qtdProduto: item.qtdProduto,
          precoUnitarioPago: item.precoUnitarioPago,
          statusItem: "PREPARAR",
        });
      });
      tab.valorTotal = items.reduce(
        (total, item) =>
          total + Number(item.qtdProduto) * Number(item.precoUnitarioPago),
        0,
      );
      return {};
    }),
    updatePedidoStatus: vi.fn(async (_id: string, status: string) => {
      const item = (database.comandas[0].itensComanda as Array<Record<string, unknown>>)[0];
      item.statusItem = status === "completed" ? "CONCLUIDO" : "PREPARANDO";
      return {};
    }),
    createComanda: vi.fn(async ({ idMesa }: { idMesa: number }) => {
      database.nextComandaId += 1;
      database.comandas.push({
        idComanda: database.nextComandaId,
        idMesa,
        statusComanda: "ABERTA",
        itensComanda: [],
        dataAberta: "2026-10-30T12:00:00.000Z",
        valorTotal: 0,
      });
      return {};
    }),
    pagarComanda: vi.fn(async (id: string, payment: { idFormaPagamento: number }) => {
      const tab = database.comandas.find((comanda) => String(comanda.idComanda) === id);
      if (tab) {
        tab.statusComanda = "FECHADA";
        tab.dataFechada = "2026-10-30T12:30:00.000Z";
        tab.detalhesPagamento = [{ idFormaPagamento: payment.idFormaPagamento }];
      }
      return {};
    }),
    getMesas: vi.fn().mockResolvedValue([]),
    getComandas: vi.fn(async () => structuredClone(database.comandas)),
    getProdutos: vi.fn(async () => structuredClone(database.products)),
    getFuncionarios: vi.fn().mockResolvedValue([]),
    getFaturamento: vi.fn().mockResolvedValue({
      dados: { receita: 0, despesas: 0, lucro: 0 },
    }),
    getLogSistema: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
    getReservas: vi.fn().mockResolvedValue([]),
  };
});

function OrderFlowProbe() {
  const { orders, products, addOrder, updateOrderStatus } = useRestaurant();
  return (
    <div>
      <output data-testid="stock">{products.find((product) => product.id === "p7")?.stock}</output>
      <ul aria-label="Pedidos">
        {orders.map((order) => (
          <li key={order.id}>
            {order.id}:{order.status}
            {order.items.map((item, index) => (
              <span key={index}>{item.productName}</span>
            ))}
            {order.status !== "completed" && (
              <button onClick={() => void updateOrderStatus(order.id, "completed")}>
                Concluir {order.id}
              </button>
            )}
          </li>
        ))}
      </ul>
      <button
        onClick={() =>
          void addOrder({
            tableNumber: 1,
            items: [
              {
                productId: "p7",
                productName: "Prato do dia",
                quantity: 2,
                price: 12.5,
              },
            ],
            status: "preparing",
            createdBy: "Teste",
            total: 25,
          })
        }
      >
        Criar pedido de teste
      </button>
    </div>
  );
}

function TabFlowProbe() {
  const { tabs, openTab, closeTab } = useRestaurant();
  const openTabForTable = tabs.find(
    (tab) => tab.tableNumber === 1 && tab.status === "open",
  );
  return (
    <div>
      <output data-testid="table-state">
        {openTabForTable ? "Mesa ocupada" : "Mesa liberada"}
      </output>
      {!openTabForTable ? (
        <button onClick={() => void openTab(1)}>Abrir comanda</button>
      ) : (
        <button onClick={() => void closeTab(openTabForTable.id, "pix")}>
          Pagar comanda
        </button>
      )}
    </div>
  );
}

function renderWithRestaurant(page: React.ReactNode) {
  return render(
    <MemoryRouter>
      <RestaurantProvider>{page}</RestaurantProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.setItem("restaurant_user", JSON.stringify({ id: "1" }));
  database.nextComandaId = 100;
  database.comandas = [];
  database.products = [
    {
      idProduto: 7,
      nomeProduto: "Prato do dia",
      categoria: "Pratos",
      precoProduto: 12.5,
      qtdEstoque: 5,
      estoqueMinimo: 1,
    },
  ];
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

describe("fluxos de pedido e comanda integrados à API", () => {
  it("cria pedido, exibe na lista, atualiza status e reconcilia estoque", async () => {
    database.comandas = [
      {
        idComanda: 42,
        idMesa: 1,
        statusComanda: "ABERTA",
        itensComanda: [],
        dataAberta: "2026-10-30T12:00:00.000Z",
        valorTotal: 0,
      },
    ];
    renderWithRestaurant(<OrderFlowProbe />);

    await waitFor(() => expect(screen.getByTestId("stock")).toHaveTextContent("5"));
    fireEvent.click(screen.getByRole("button", { name: "Criar pedido de teste" }));

    await waitFor(() => expect(screen.getByTestId("stock")).toHaveTextContent("3"));
    expect(await screen.findByText(/42:preparing/)).toBeInTheDocument();
    expect(screen.getByText("Prato do dia")).toBeInTheDocument();
    expect(createPedido).toHaveBeenCalledWith({
      idMesa: 1,
      itens: [{ idProduto: 7, qtdProduto: 2, precoUnitarioPago: 12.5 }],
    });

    fireEvent.click(screen.getByRole("button", { name: "Concluir 42" }));
    await screen.findByText("42:completed");
    expect(screen.getByTestId("stock")).toHaveTextContent("3");
    expect(updatePedidoStatus).toHaveBeenCalledWith("42", "completed");
  });

  it("abre comanda, registra pagamento e libera a mesa", async () => {
    renderWithRestaurant(<TabFlowProbe />);
    await waitFor(() =>
      expect(screen.getByTestId("table-state")).toHaveTextContent("Mesa liberada"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir comanda" }));
    await screen.findByText("Mesa ocupada");
    expect(createComanda).toHaveBeenCalledWith({ idMesa: 1, idCliente: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Pagar comanda" }));

    await screen.findByText("Mesa liberada");
    expect(pagarComanda).toHaveBeenCalledWith("101", {
      idFormaPagamento: 1,
      troco: 0,
    });
  });
});
