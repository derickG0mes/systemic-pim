import { useState } from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider, useAuth, UserRole } from "@/contexts/AuthContext";
import {
  RestaurantProvider,
  useRestaurant,
} from "@/contexts/RestaurantContext";
import { getPermissions, hasPermission, Permission } from "@/lib/rbac";

vi.mock("@/hooks/useSignalR", () => ({
  useSignalR: () => ({ connected: false, enabled: false }),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function LoginProbe() {
  const { login, user, failedAttempts, lockedUntil } = useAuth();
  const [message, setMessage] = useState("");

  return (
    <div>
      <button
        onClick={async () => {
          const result = await login("test@example.com", "password");
          setMessage(result.message);
        }}
      >
        Tentar login
      </button>
      <output>{message}</output>
      <output data-testid="authenticated">{user?.role ?? "anônimo"}</output>
      <output data-testid="failed-attempts">{failedAttempts}</output>
      <output data-testid="locked-until">{lockedUntil ?? ""}</output>
    </div>
  );
}

function RestaurantProbe() {
  const { addOrder, closeTab } = useRestaurant();

  return (
    <div>
      <button
        onClick={() =>
          void addOrder({
            tableNumber: 9,
            items: [
              {
                productId: "p7",
                productName: "Prato teste",
                quantity: 2,
                price: 6,
              },
            ],
            status: "preparing",
            createdBy: "Teste",
            total: 12,
          })
        }
      >
        Criar pedido
      </button>
      <button onClick={() => void closeTab("42", "pix")}>
        Pagar comanda
      </button>
    </div>
  );
}

const permissions: Permission[] = [
  "dashboard",
  "orders",
  "tabs",
  "inventory",
  "reservations",
  "reports",
  "users",
  "audit",
  "backup",
  "accessibility",
];

const expectedPermissions: Record<UserRole, Permission[]> = {
  employee: ["orders", "tabs", "reservations", "accessibility"],
  admin: permissions,
  owner: permissions,
};

function setAuthenticatedUser(role: UserRole) {
  localStorage.setItem(
    "restaurant_user",
    JSON.stringify({
      id: "1",
      name: "Usuário de teste",
      email: "test@example.com",
      role,
      position: "Teste",
    }),
  );
}

function renderProtectedDashboard() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AuthProvider>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute permission="dashboard">
                <p>Dashboard protegida</p>
              </ProtectedRoute>
            }
          />
          <Route path="/orders" element={<p>Pedidos</p>} />
          <Route path="/login" element={<p>Login</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("autenticação", () => {
  it("autentica com sucesso usando a resposta da API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          dados: {
            token: "token-de-teste",
            id: 8,
            nomeUsuario: "Admin de teste",
            role: "admin",
          },
        }),
      ),
    );

    render(
      <AuthProvider>
        <LoginProbe />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Tentar login" }));

    expect(await screen.findByText("Login realizado com sucesso!")).toBeInTheDocument();
    expect(screen.getByTestId("authenticated")).toHaveTextContent("admin");
    expect(localStorage.getItem("authToken")).toBe("token-de-teste");
    expect(JSON.parse(localStorage.getItem("restaurant_user") ?? "{}")).toMatchObject({
      id: "8",
      role: "admin",
    });
  });

  it("mostra a falha de autenticação reportada pela API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ mensagem: "Credenciais inválidas" }, 401),
      ),
    );

    render(
      <AuthProvider>
        <LoginProbe />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Tentar login" }));

    expect(await screen.findByText("Credenciais inválidas")).toBeInTheDocument();
    expect(screen.getByTestId("failed-attempts")).toHaveTextContent("1");
    expect(screen.getByTestId("authenticated")).toHaveTextContent("anônimo");
  });

  it("bloqueia após cinco falhas e não envia novas requisições", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () =>
        jsonResponse({ mensagem: "Credenciais inválidas" }, 401),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <LoginProbe />
      </AuthProvider>,
    );

    const loginButton = screen.getByRole("button", { name: "Tentar login" });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await user.click(loginButton);
    }

    expect(
      await screen.findByText("Muitas tentativas. Conta bloqueada por 15 minutos."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("failed-attempts")).toHaveTextContent("5");
    expect(Number(screen.getByTestId("locked-until").textContent)).toBeGreaterThan(
      Date.now(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(5);

    await user.click(loginButton);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});

describe("rotas protegidas e permissões", () => {
  it.each(Object.entries(expectedPermissions) as [UserRole, Permission[]][])(
    "mantém a matriz de permissões de %s",
    (role, expected) => {
      expect(getPermissions(role)).toEqual(expected);
      for (const permission of permissions) {
        expect(hasPermission(role, permission)).toBe(
          expected.includes(permission),
        );
      }
    },
  );

  it("redireciona usuário anônimo para login", () => {
    renderProtectedDashboard();
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("redireciona employee sem permissão para pedidos", () => {
    setAuthenticatedUser("employee");
    renderProtectedDashboard();
    expect(screen.getByText("Pedidos")).toBeInTheDocument();
  });

  it.each(["admin", "owner"] as const)(
    "permite que %s acesse o dashboard",
    (role) => {
      setAuthenticatedUser(role);
      renderProtectedDashboard();
      expect(screen.getByText("Dashboard protegida")).toBeInTheDocument();
    },
  );
});

describe("pedidos e pagamentos", () => {
  function prepareRestaurantFetch() {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <RestaurantProvider>
        <RestaurantProbe />
      </RestaurantProvider>,
    );
    localStorage.setItem("authToken", "token-de-teste");
    return fetchMock;
  }

  it("envia pedido com idMesa e itens, sem idCliente", async () => {
    const fetchMock = prepareRestaurantFetch();

    fireEvent.click(screen.getByRole("button", { name: "Criar pedido" }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([input]) =>
          String(input).endsWith("/pedidos"),
        ),
      ).toBe(true),
    );

    const [url, options] = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/pedidos"),
    )!;
    expect(String(url)).toContain("/pedidos");
    expect(options?.method).toBe("POST");
    expect(JSON.parse(String(options?.body))).toEqual({
      idMesa: 9,
      itens: [{ idProduto: 7, qtdProduto: 2, precoUnitarioPago: 6 }],
    });
    expect(JSON.parse(String(options?.body))).not.toHaveProperty("idCliente");
  });

  it("envia o método de pagamento ao pagar comanda", async () => {
    const fetchMock = prepareRestaurantFetch();

    fireEvent.click(screen.getByRole("button", { name: "Pagar comanda" }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([input]) =>
          String(input).includes("/comanda/42/pagar"),
        ),
      ).toBe(true),
    );

    const [url, options] = fetchMock.mock.calls.find(([input]) =>
      String(input).includes("/comanda/42/pagar"),
    )!;
    expect(String(url)).toContain("/comanda/42/pagar");
    expect(options?.method).toBe("PUT");
    expect(JSON.parse(String(options?.body))).toEqual({
      idFormaPagamento: 1,
      troco: 0,
    });
  });
});
