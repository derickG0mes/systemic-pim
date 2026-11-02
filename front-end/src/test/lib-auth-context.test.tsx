import { useState } from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/useAuth";
import type { UserRole } from "@/contexts/AuthContext";
import { getPermissions, hasPermission } from "@/lib/rbac";
import { addAuditLog, getAuditLogs } from "@/lib/audit";
import {
  getAuthenticatedProfileAPI,
  loginAPI,
  logoutAPI,
} from "@/services/api";

vi.mock("@/services/api", () => ({
  getAuthenticatedProfileAPI: vi.fn(),
  loginAPI: vi.fn(),
  logoutAPI: vi.fn(),
}));

function AuthProbe() {
  const { login, logout, user, authReady, failedAttempts } = useAuth();
  const [message, setMessage] = useState("");

  return (
    <div>
      <span data-testid="ready">{String(authReady)}</span>
      <span data-testid="user">{user?.role ?? "anonymous"}</span>
      <span data-testid="attempts">{failedAttempts}</span>
      <span data-testid="message">{message}</span>
      <button onClick={() => void login("person@example.com", "secret").then((result) => setMessage(result.message))}>
        Entrar
      </button>
      <button onClick={logout}>Sair</button>
    </div>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>,
  );
}

async function waitForAuthReady() {
  await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("true"));
}

describe("AuthContext edge cases", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedProfileAPI).mockResolvedValue(null);
    vi.mocked(logoutAPI).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("reports network failures without counting invalid credentials", async () => {
    vi.mocked(loginAPI).mockRejectedValue(new TypeError("Failed to fetch"));
    renderAuth();
    await waitForAuthReady();

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText(
      "Servidor indisponível. Verifique sua conexão e tente novamente.",
    )).toBeInTheDocument();
    expect(screen.getByTestId("attempts")).toHaveTextContent("0");
  });

  it("rejects a successful login response without a recognized role", async () => {
    vi.mocked(loginAPI).mockResolvedValue({
      sucesso: true,
      dados: { id: 1, nomeUsuario: "Pessoa", role: "manager" },
    } as never);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    renderAuth();
    await waitForAuthReady();

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("A API não retornou um papel de usuário válido.")).toBeInTheDocument();
    expect(screen.getByTestId("attempts")).toHaveTextContent("0");
    expect(consoleError).toHaveBeenCalled();
  });

  it("counts API login errors and removes the internal API prefix", async () => {
    vi.mocked(loginAPI).mockRejectedValue(new Error("[API] Login: Acesso negado"));
    renderAuth();
    await waitForAuthReady();

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Acesso negado")).toBeInTheDocument();
    expect(screen.getByTestId("attempts")).toHaveTextContent("1");
  });

  it("clears local authentication when server profile validation fails", async () => {
    localStorage.setItem("restaurant_user", JSON.stringify({ role: "admin" }));
    vi.mocked(getAuthenticatedProfileAPI).mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId("ready")).toHaveTextContent("true");
      expect(screen.getByTestId("user")).toHaveTextContent("anonymous");
    });
    expect(localStorage.getItem("restaurant_user")).toBeNull();
  });

  it("recovers from malformed local profile details", async () => {
    localStorage.setItem("restaurant_user", "{invalid");
    vi.mocked(getAuthenticatedProfileAPI).mockResolvedValue({
      id: 5,
      nome: "Perfil válido",
      role: "employee",
    } as never);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    renderAuth();

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("employee"));
    expect(JSON.parse(localStorage.getItem("restaurant_user") ?? "{}")).toMatchObject({
      email: "",
      position: "Funcionário",
    });
    expect(consoleError).toHaveBeenCalled();
  });

  it("handles unknown roles in RBAC and keeps audit log reads isolated", () => {
    const unsupportedRole = "manager" as UserRole;
    expect(getPermissions(unsupportedRole)).toEqual([]);
    expect(hasPermission(unsupportedRole, "dashboard")).toBe(false);

    const entry = addAuditLog("test", "details", "user-1");
    const logs = getAuditLogs();
    expect(logs).toContainEqual(entry);
    logs.pop();
    expect(getAuditLogs()).toContainEqual(entry);
  });
});
