import React, { useEffect, useState } from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPedido,
  getComandas,
  getFaturamento,
  getFuncionarios,
  getLogSistema,
  getMesas,
  getProdutos,
  getReservas,
  markComandaInadimplente,
  pagarComanda,
  updatePedido,
  updatePedidoStatus,
} from "@/services/api";
import { RestaurantProvider } from "@/contexts/RestaurantContext";
import { useRestaurant } from "@/contexts/useRestaurant";

vi.mock("@/hooks/useSignalR", () => ({
  useSignalR: () => ({ connected: false, enabled: true }),
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    createPedido: vi.fn(),
    updatePedido: vi.fn(),
    updatePedidoStatus: vi.fn(),
    getMesas: vi.fn(),
    pagarComanda: vi.fn(),
    markComandaInadimplente: vi.fn(),
    getComandas: vi.fn(),
    getProdutos: vi.fn(),
    getFuncionarios: vi.fn(),
    getFaturamento: vi.fn(),
    getLogSistema: vi.fn(),
    getReservas: vi.fn(),
  };
});

const initialComandas = [
  {
    idComanda: 42,
    idMesa: 9,
    statusComanda: "ABERTA",
    itensComanda: [
      {
        idProduto: 7,
        nomeProduto: "Prato teste",
        qtdProduto: 2,
        precoUnitarioPago: 6,
        statusItem: "PREPARAR",
      },
    ],
    dataAberta: "2026-10-30T10:00:00.000Z",
    valorTotal: 12,
  },
];

const initialProducts = [
  {
    idProduto: 7,
    nomeProduto: "Prato teste",
    categoria: "Pratos",
    precoProduto: 6,
    qtdEstoque: 8,
    estoqueMinimo: 2,
  },
];

function RestaurantStateProbe() {
  const {
    products,
    orders,
    tabs,
    addOrder,
    editOrder,
    updateOrderStatus,
    closeTab,
    markTabUnpaid,
  } = useRestaurant();
  const newOrder = {
    tableNumber: 9,
    items: [{ productId: "p7", productName: "Prato teste", quantity: 2, price: 6 }],
    status: "preparing" as const,
    createdBy: "Teste",
    total: 12,
  };
  const editedItems = [
    { productId: "p7", productName: "Prato teste", quantity: 3, price: 6 },
  ];

  return (
    <div>
      <output data-testid="state">{JSON.stringify({ products, orders, tabs })}</output>
      <button onClick={() => void addOrder(newOrder)}>Criar pedido</button>
      <button onClick={() => void editOrder("42", editedItems)}>Editar pedido</button>
      <button onClick={() => void updateOrderStatus("42", "completed")}>
        Concluir pedido
      </button>
      <button onClick={() => void closeTab("42", "pix")}>Pagar comanda</button>
      <button onClick={() => void markTabUnpaid("42")}>Marcar não pago</button>
    </div>
  );
}

function ToastProbe() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleToast = (event: Event) => {
      const toastEvent = event as CustomEvent<{ type: string; message: string }>;
      if (toastEvent.detail.type === "error") setMessage(toastEvent.detail.message);
    };
    window.addEventListener("restaurant:toast", handleToast);
    return () => window.removeEventListener("restaurant:toast", handleToast);
  }, []);

  return <output data-testid="toast">{message}</output>;
}

function renderRestaurant() {
  return render(
    <RestaurantProvider>
      <ToastProbe />
      <RestaurantStateProbe />
    </RestaurantProvider>,
  );
}

function readState() {
  return JSON.parse(screen.getByTestId("state").textContent || "{}");
}

beforeEach(() => {
  localStorage.setItem("restaurant_user", JSON.stringify({ id: "1" }));
  vi.mocked(createPedido).mockResolvedValue({});
  vi.mocked(updatePedido).mockResolvedValue({});
  vi.mocked(updatePedidoStatus).mockResolvedValue({});
  vi.mocked(getMesas).mockResolvedValue([]);
  vi.mocked(pagarComanda).mockResolvedValue({});
  vi.mocked(markComandaInadimplente).mockResolvedValue({});
  vi.mocked(getComandas).mockResolvedValue(initialComandas);
  vi.mocked(getProdutos).mockResolvedValue(initialProducts);
  vi.mocked(getFuncionarios).mockResolvedValue([]);
  vi.mocked(getFaturamento).mockResolvedValue({
    dados: { receita: 0, despesas: 0, lucro: 0 },
  });
  vi.mocked(getLogSistema).mockResolvedValue({ sucesso: true, dados: [] });
  vi.mocked(getReservas).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

describe("rollback das operações de pedido e comanda", () => {
  it("restaura pedido, estoque e comanda quando a criação falha", async () => {
    vi.mocked(createPedido).mockRejectedValue(new Error("falha"));
    renderRestaurant();

    await waitFor(() => expect(readState().orders).toHaveLength(1));
    const before = readState();
    fireEvent.click(screen.getByRole("button", { name: "Criar pedido" }));

    await waitFor(() => expect(screen.getByTestId("toast")).toHaveTextContent("Falha ao criar pedido"));
    expect(readState()).toEqual(before);
  });

  it("restaura pedido, estoque e total da comanda quando a edição falha", async () => {
    vi.mocked(updatePedido).mockRejectedValue(new Error("falha"));
    renderRestaurant();

    await waitFor(() => expect(readState().orders).toHaveLength(1));
    const before = readState();
    fireEvent.click(screen.getByRole("button", { name: "Editar pedido" }));

    await waitFor(() => expect(screen.getByTestId("toast")).toHaveTextContent("Falha ao editar pedido"));
    expect(readState()).toEqual(before);
  });

  it("restaura o status do pedido quando a atualização falha", async () => {
    vi.mocked(updatePedidoStatus).mockRejectedValue(new Error("falha"));
    renderRestaurant();

    await waitFor(() => expect(readState().orders).toHaveLength(1));
    const before = readState();
    fireEvent.click(screen.getByRole("button", { name: "Concluir pedido" }));

    await waitFor(() => expect(screen.getByTestId("toast")).toHaveTextContent("Falha ao atualizar status"));
    expect(readState()).toEqual(before);
  });

  it("restaura a comanda aberta quando o pagamento falha", async () => {
    vi.mocked(pagarComanda).mockRejectedValue(new Error("falha"));
    renderRestaurant();

    await waitFor(() => expect(readState().tabs).toHaveLength(1));
    const before = readState();
    fireEvent.click(screen.getByRole("button", { name: "Pagar comanda" }));

    await waitFor(() => expect(screen.getByTestId("toast")).toHaveTextContent("Falha ao registrar pagamento"));
    expect(readState()).toEqual(before);
  });

  it("restaura a comanda aberta quando marcar não pago falha", async () => {
    vi.mocked(markComandaInadimplente).mockRejectedValue(new Error("falha"));
    renderRestaurant();

    await waitFor(() => expect(readState().tabs).toHaveLength(1));
    const before = readState();
    fireEvent.click(screen.getByRole("button", { name: "Marcar não pago" }));

    await waitFor(() => expect(screen.getByTestId("toast")).toHaveTextContent("Falha ao registrar inadimplência"));
    expect(readState()).toEqual(before);
  });
});
