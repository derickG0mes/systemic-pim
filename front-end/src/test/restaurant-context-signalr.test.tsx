import React from "react";
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getComandas } from "@/services/api";
import { RestaurantProvider } from "@/contexts/RestaurantContext";
import OrdersPage from "@/pages/OrdersPage";

const signalRState = vi.hoisted(() => ({
  connected: false,
  enabled: true,
}));

vi.mock("@/hooks/useSignalR", () => ({
  useSignalR: () => signalRState,
}));

vi.mock("@/contexts/useAuth", () => ({
  useAuth: () => ({ user: { name: "Teste" } }),
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    createPedido: vi.fn().mockResolvedValue({}),
    updatePedido: vi.fn().mockResolvedValue({}),
    updatePedidoStatus: vi.fn().mockResolvedValue({}),
    getMesas: vi.fn().mockResolvedValue([]),
    pagarComanda: vi.fn().mockResolvedValue({}),
    markComandaInadimplente: vi.fn().mockResolvedValue({}),
    getComandas: vi.fn().mockResolvedValue([]),
    getProdutos: vi.fn().mockResolvedValue([]),
    createProduto: vi.fn().mockResolvedValue({}),
    updateProduto: vi.fn().mockResolvedValue({}),
    createReserva: vi.fn().mockResolvedValue({}),
    deleteReserva: vi.fn().mockResolvedValue({}),
    getFuncionarios: vi.fn().mockResolvedValue([]),
    createFuncionario: vi.fn().mockResolvedValue({}),
    updateFuncionario: vi.fn().mockResolvedValue({}),
    getFaturamento: vi.fn().mockResolvedValue({
      dados: { receita: 0, despesas: 0, lucro: 0 },
    }),
    getLogSistema: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
    getReservas: vi.fn().mockResolvedValue([]),
    ajustarEstoque: vi.fn().mockResolvedValue({}),
  };
});

function renderKitchen() {
  return render(
    <MemoryRouter>
      <RestaurantProvider>
        <OrdersPage />
      </RestaurantProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.setItem("restaurant_user", JSON.stringify({ id: "1" }));
  signalRState.connected = false;
  signalRState.enabled = true;
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

describe("atualização da cozinha por SignalR e polling", () => {
  it("pausa o polling conectado e retoma automaticamente ao desconectar", async () => {
    const { rerender } = renderKitchen();

    await act(async () => {
      for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
    });
    expect(getComandas).toHaveBeenCalled();
    const initialComandaCalls = vi.mocked(getComandas).mock.calls.length;
    expect(screen.getByRole("status")).toHaveTextContent(
      "Modo atualização periódica",
    );

    signalRState.connected = true;
    rerender(
      <MemoryRouter>
        <RestaurantProvider>
          <OrdersPage />
        </RestaurantProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Tempo real ativo");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });
    expect(getComandas).toHaveBeenCalledTimes(initialComandaCalls);

    signalRState.connected = false;
    rerender(
      <MemoryRouter>
        <RestaurantProvider>
          <OrdersPage />
        </RestaurantProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Modo atualização periódica",
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });
    expect(getComandas).toHaveBeenCalledTimes(initialComandaCalls + 1);
  });
});
