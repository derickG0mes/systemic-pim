import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RestaurantProvider } from "@/contexts/RestaurantContext";
import DashboardPage from "@/pages/DashboardPage";
import ReportsPage from "@/pages/ReportsPage";
import {
  getFaturamento,
  getProdutosMaisVendidos,
  getReceitaPorForma,
  getRelatorioFaturamento,
} from "@/services/api";

vi.mock("@/hooks/useSignalR", () => ({
  useSignalR: () => ({ connected: false, enabled: false }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("recharts", () => ({
  Bar: () => null,
  BarChart: ({ data }: { data: unknown }) => (
    <output data-testid="bar-chart">{JSON.stringify(data)}</output>
  ),
  CartesianGrid: () => null,
  Cell: () => null,
  Pie: ({ data }: { data: unknown }) => (
    <output data-testid="pie-chart">{JSON.stringify(data)}</output>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    getFaturamento: vi.fn().mockResolvedValue({
      dados: { receita: 1500.5, despesas: 300.25, lucro: 1200.25 },
    }),
    getReceitaPorForma: vi.fn().mockResolvedValue([
      { formaPagemento: "Pix", total: 900.5 },
      { formaPagamento: "Dinheiro", total: 600 },
    ]),
    getRelatorioFaturamento: vi.fn().mockResolvedValue({
      dados: { receita: 800, despesas: 100, lucro: 700 },
    }),
    getProdutosMaisVendidos: vi.fn().mockResolvedValue([
      { idProduto: 9, nomeProduto: "Produto API", quantidadeVendida: 17 },
    ]),
    getMesas: vi.fn().mockResolvedValue([]),
    getComandas: vi.fn().mockResolvedValue([]),
    getProdutos: vi.fn().mockResolvedValue([]),
    getFuncionarios: vi.fn().mockResolvedValue([]),
    getLogSistema: vi.fn().mockResolvedValue({ sucesso: true, dados: [] }),
    getReservas: vi.fn().mockResolvedValue([]),
  };
});

beforeEach(() => {
  localStorage.setItem("restaurant_user", JSON.stringify({ id: "1" }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

describe("valores financeiros das páginas", () => {
  it("Dashboard exibe os totais e dados de vendas fornecidos pelos endpoints", async () => {
    render(
      <RestaurantProvider>
        <DashboardPage />
      </RestaurantProvider>,
    );

    expect(await screen.findByText("R$ 1500.50")).toBeInTheDocument();
    expect(screen.getByText("R$ 1200.25")).toBeInTheDocument();
    expect(screen.getByText("20.0%")).toBeInTheDocument();
    expect(getFaturamento).toHaveBeenCalled();
    expect(getReceitaPorForma).toHaveBeenCalled();
    expect(getProdutosMaisVendidos).toHaveBeenCalled();
    expect(screen.getByTestId("bar-chart")).toHaveTextContent(
      '"name":"Produto API","qty":17',
    );
    expect(screen.getByTestId("pie-chart")).toHaveTextContent(
      '"name":"Pix","value":900.5',
    );
  });

  it("Reports exibe receita, despesas, lucro e pagamentos da resposta da API", async () => {
    render(<ReportsPage />);

    const revenue = screen.getByText("Receita Total");
    const expenses = screen.getByText("Despesas");
    const profit = screen.getByText("Lucro Líquido");
    await waitFor(() => {
      expect(revenue.parentElement).toHaveTextContent("800.00");
      expect(expenses.parentElement).toHaveTextContent("100.00");
      expect(profit.parentElement).toHaveTextContent("700.00");
    });
    expect(screen.getByText("Pix").parentElement).toHaveTextContent("900.50");
    expect(screen.getByText("Dinheiro").parentElement).toHaveTextContent("600.00");
    expect(getRelatorioFaturamento).toHaveBeenCalled();
    expect(getReceitaPorForma).toHaveBeenCalled();
  });
});
