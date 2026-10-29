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

function stubProfileValidation(role: UserRole | null) {
  const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) =>
    String(input).endsWith("/autenticacao/validar")
      ? role
        ? jsonResponse({
            sucesso: true,
            dados: { id: 1, nome: "Perfil do servidor", role },
          })
        : jsonResponse({ sucesso: false }, 401)
      : jsonResponse({}),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
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
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/autenticacao/validar")) {
        return jsonResponse({ sucesso: false }, 401);
      }
      if (String(input).endsWith("/autenticacao/csrf")) {
        return jsonResponse({ requestToken: "csrf-de-teste" });
      }
      return jsonResponse({
        sucesso: true,
        dados: {
          id: 8,
          nomeUsuario: "Admin de teste",
          role: "admin",
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthProvider>
        <LoginProbe />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Tentar login" }));

    expect(await screen.findByText("Login realizado com sucesso!")).toBeInTheDocument();
    expect(screen.getByTestId("authenticated")).toHaveTextContent("admin");
    expect(localStorage.getItem("authToken")).toBeNull();
    expect(JSON.parse(localStorage.getItem("restaurant_user") ?? "{}")).toMatchObject({
      id: "8",
      role: "admin",
    });
    const loginRequest = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith("/autenticacao/login"),
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(loginRequest?.[1]).toMatchObject({
      credentials: "include",
      headers: expect.objectContaining({ "X-CSRF-TOKEN": "csrf-de-teste" }),
    });
  });

  it("mostra a falha de autenticação reportada pela API", async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) =>
      String(input).endsWith("/autenticacao/csrf")
        ? jsonResponse({ requestToken: "csrf-de-teste" })
        : String(input).endsWith("/autenticacao/validar")
          ? jsonResponse({ sucesso: false }, 401)
          : jsonResponse({ mensagem: "Credenciais inválidas" }, 401),
    );
    vi.stubGlobal("fetch", fetchMock);

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
      .mockImplementation(async (input: RequestInfo | URL) =>
        String(input).endsWith("/autenticacao/validar")
          ? jsonResponse({ sucesso: false }, 401)
          : String(input).endsWith("/autenticacao/csrf")
            ? jsonResponse({ requestToken: "csrf-de-teste" })
            : jsonResponse({ mensagem: "Credenciais inválidas" }, 401),
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
    const loginRequests = () =>
      fetchMock.mock.calls.filter(([input]) =>
        String(input).endsWith("/autenticacao/login"),
      );
    expect(loginRequests()).toHaveLength(5);

    await user.click(loginButton);
    expect(loginRequests()).toHaveLength(5);
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

  it("redireciona usuário anônimo para login após validar a sessão", async () => {
    stubProfileValidation(null);
    renderProtectedDashboard();
    expect(await screen.findByText("Login")).toBeInTheDocument();
  });

  it("redireciona employee sem permissão para pedidos", async () => {
    setAuthenticatedUser("employee");
    stubProfileValidation("employee");
    renderProtectedDashboard();
    expect(await screen.findByText("Pedidos")).toBeInTheDocument();
  });

  it.each(["admin", "owner"] as const)(
    "permite que %s acesse o dashboard",
    async (role) => {
      setAuthenticatedUser(role);
      stubProfileValidation(role);
      renderProtectedDashboard();
      expect(await screen.findByText("Dashboard protegida")).toBeInTheDocument();
    },
  );

  it("ignora o role admin local quando o servidor confirma employee", async () => {
    setAuthenticatedUser("admin");
    const fetchMock = stubProfileValidation("employee");

    renderProtectedDashboard();

    expect(await screen.findByText("Pedidos")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard protegida")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("restaurant_user") ?? "{}")).toMatchObject({
      role: "employee",
      name: "Perfil do servidor",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/autenticacao\/validar$/),
      expect.objectContaining({ credentials: "include" }),
    );
  });
});

describe("pedidos e pagamentos", () => {
  function prepareRestaurantFetch() {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) =>
      String(input).endsWith("/autenticacao/csrf")
        ? jsonResponse({ requestToken: "csrf-de-teste" })
        : jsonResponse([]),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <RestaurantProvider>
        <RestaurantProbe />
      </RestaurantProvider>,
    );
    setAuthenticatedUser("employee");
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
    expect(options?.credentials).toBe("include");
    expect(options?.headers).toMatchObject({
      "X-CSRF-TOKEN": "csrf-de-teste",
    });
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
    expect(options?.credentials).toBe("include");
    expect(JSON.parse(String(options?.body))).toEqual({
      idFormaPagamento: 1,
      troco: 0,
    });
  });
});
