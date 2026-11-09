import type {
  AuthenticatedProfile,
  CommandDto,
  FinancialSummary,
  PaymentFormDto,
  ProductDto,
  ReservationDto,
  TableDto,
} from "../types/api";
import type { NotificationList } from "../types/notification";
import { clearCsrfToken, fetchApi, getApiBaseUrl, getCsrfRequestToken, request, unwrap } from "./http";

export async function validateSession() {
  try {
    const profile = await request<AuthenticatedProfile>("/autenticacao/validar", {
      notifyUnauthorized: false,
    });
    if (
      !profile ||
      !Number.isInteger(Number(profile.id)) ||
      typeof profile.nome !== "string" ||
      !["employee", "admin", "owner"].includes(profile.role)
    ) {
      throw new Error("A API retornou um perfil de autenticação inválido.");
    }
    return { ...profile, id: Number(profile.id) };
  } catch (error) {
    if (error instanceof Error && "status" in error && error.status === 401) return null;
    throw error;
  }
}

export async function login(email: string, password: string) {
  const csrfToken = await getCsrfRequestToken();
  const response = await fetchApi(`${getApiBaseUrl()}/autenticacao/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": csrfToken,
    },
    body: JSON.stringify({ email, password }),
  });
  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("A API retornou uma resposta JSON inválida.");
  }

  if (!response.ok) {
    const body = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    const message = typeof body.mensagem === "string" ? body.mensagem : `Falha no login (HTTP ${response.status}).`;
    const retryAfter = response.headers.get("Retry-After");
    const wait = response.status === 429
      ? retryAfter
        ? ` Aguarde ${retryAfter} segundos.`
        : " Aguarde um momento antes de tentar novamente."
      : "";
    throw new Error(`${message}${wait}`);
  }

  unwrap(payload);
  clearCsrfToken();
  await getCsrfRequestToken(true);
}

export async function logout() {
  try {
    await request("/autenticacao/logout", {
      method: "POST",
      notifyUnauthorized: false,
      body: JSON.stringify({}),
    });
  } finally {
    clearCsrfToken();
  }
}

export const listTables = () => request<TableDto[]>("/mesa");
export const listProducts = () => request<ProductDto[]>("/produto");
export const listComandas = () => request<CommandDto[]>("/comanda");
export const listOpenComandas = () => request<CommandDto[]>("/comanda/abertas/todas");
export const getComanda = (id: number) => request<CommandDto>(`/comanda/${id}`);
export const listOrders = () => request<CommandDto[]>("/pedidos");
export const listPaymentForms = () => request<PaymentFormDto[]>("/formapagamento");
export const listReservations = () => request<ReservationDto[]>("/reserva");
export async function listNotifications() {
  const result = await request<NotificationList>("/notificacoes?limit=50");
  if (!result || !Array.isArray(result.items) || !Number.isInteger(result.unreadCount)) {
    throw new Error("A API retornou uma lista de notificações inválida.");
  }
  return result;
}
export const markNotificationRead = (id: number) =>
  request<void>(`/notificacoes/${id}/lida`, { method: "PATCH" });
export const markAllNotificationsRead = () =>
  request<{ atualizadas: number }>("/notificacoes/marcar-todas-lidas", {
    method: "POST",
    body: JSON.stringify({}),
  });

export async function openComanda(idMesa: number) {
  // A API usa idCliente zero para resolver o cliente padrão "Consumidor".
  return request<CommandDto>("/comanda", {
    method: "POST",
    body: JSON.stringify({ idMesa, idCliente: 0 }),
  });
}

export function addComandaItem(
  idComanda: number,
  item: { idProduto: number; qtdProduto: number; precoUnitarioPago: number },
) {
  return request(`/comanda/${idComanda}/itens`, {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export function removeComandaItem(idComanda: number, idItem: number) {
  return request(`/comanda/${idComanda}/itens/${idItem}`, { method: "DELETE" });
}

export function payComanda(idComanda: number, idFormaPagamento: number) {
  return request(`/comanda/${idComanda}/pagar`, {
    method: "PUT",
    body: JSON.stringify({ idFormaPagamento, troco: 0 }),
  });
}

export function closeComanda(idComanda: number) {
  return request(`/comanda/${idComanda}/fechar`, { method: "PUT" });
}

export function createOrder(
  idMesa: number,
  itens: { idProduto: number; qtdProduto: number; precoUnitarioPago: number }[],
) {
  return request("/pedidos", {
    method: "POST",
    body: JSON.stringify({ idMesa, itens }),
  });
}

export function updateOrderStatus(id: number, status: "preparing" | "in_progress" | "completed") {
  return request(`/pedidos/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export function createReservation(data: { nomeCliente: string; numeroMesa: number; dataReserva: string }) {
  return request("/reserva", { method: "POST", body: JSON.stringify(data) });
}

export function cancelReservation(id: number) {
  return request(`/reserva/${id}`, { method: "DELETE" });
}

export async function getDailyFinancialSummary() {
  const result = await request<FinancialSummary>("/faturamento");
  return {
    receita: Number(result.receita ?? 0),
    despesas: Number(result.despesas ?? 0),
    lucro: Number(result.lucro ?? 0),
  };
}

export async function getFinancialReport(dataInicio: string, dataFim: string) {
  const query = new URLSearchParams({ dataInicio, dataFim });
  return request<FinancialSummary>(`/faturamento/relatorio?${query.toString()}`);
}

export async function getRevenueByPayment(dataInicio: string, dataFim: string) {
  const query = new URLSearchParams({ dataInicio, dataFim });
  return request<{ formaPagemento?: string; formaPagamento?: string; total: number }[]>(
    `/faturamento/receita-por-forma?${query.toString()}`,
  );
}

export async function getTopProducts() {
  return request<{ idProduto: number; nomeProduto: string; quantidadeVendida: number }[]>(
    "/faturamento/produtos-mais-vendidos",
  );
}

export function unwrapList<T>(value: unknown) {
  const result = unwrap<T[]>(value);
  return Array.isArray(result) ? result : [];
}
