const currentHost = window.location.hostname;
export const API_URL = `${window.location.protocol}//${currentHost}:5050/api`;

function resolveApiUrl(): string {
  return API_URL;
}

let csrfRequestToken: string | null = null;

export function hasAuthSession(): boolean {
  return Boolean(localStorage.getItem("restaurant_user"));
}

/**
 * Retorna o ID numérico do funcionário logado, lido do localStorage.
 * O objeto restaurant_user é gravado no login e contém apenas dados não-sensíveis.
 */
export function getLoggedUserId(): number | null {
  try {
    const raw = localStorage.getItem("restaurant_user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    const id = parseInt(u.id, 10);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

async function getCsrfRequestToken(): Promise<string> {
  if (csrfRequestToken) return csrfRequestToken;

  const response = await fetch(`${resolveApiUrl()}/autenticacao/csrf`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const data = await parseJsonResponse(response);
  if (!response.ok || typeof data?.requestToken !== "string") {
    throw new Error("Não foi possível obter o token de proteção CSRF.");
  }

  csrfRequestToken = data.requestToken;
  return csrfRequestToken;
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Resposta inválida da API (JSON)");
  }
}

// A sessão é enviada automaticamente pelo cookie HttpOnly do navegador.
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  const method = (options.method ?? "GET").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    headers["X-CSRF-TOKEN"] = await getCsrfRequestToken();
  }

  const response = await fetch(`${resolveApiUrl()}${endpoint}`, {
    ...options,
    credentials: "include",
    headers,
  });

  const text = await response.text();

  if (!response.ok) {
    // Sinaliza ao AuthContext para fazer logout automático ao receber 401
    if (response.status === 401) {
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    let detail = text;
    try {
      const parsed = text ? JSON.parse(text) : null;
      detail = parsed?.mensagem || parsed?.message || text;
    } catch {
      /* mantém texto bruto */
    }
    const err = new Error(
      `[API] ${endpoint} → ${response.status} ${response.statusText}${detail ? `: ${detail}` : ""}`,
    );
    console.error(err.message);
    throw err;
  }


  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const err = new Error(`[API] ${endpoint} — resposta inválida (JSON)`);
    console.error(err.message, text);
    throw err;
  }
}

// ============================================
// AUTENTICAÇÃO
// ============================================

export async function loginAPI(email: string, password: string) {
  const csrfToken = await getCsrfRequestToken();
  const response = await fetch(`${resolveApiUrl()}/autenticacao/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": csrfToken,
    },
    body: JSON.stringify({ email, password }),
  });

  const data = (await parseJsonResponse(response)) ?? {};

  if (!response.ok) {
    throw new Error(
      data.mensagem || `Erro ${response.status}: ${response.statusText}`,
    );
  }

  csrfRequestToken = null;
  return data;
}

export interface AuthenticatedProfile {
  id: number;
  nome: string;
  role: string;
}

export async function getAuthenticatedProfileAPI(): Promise<AuthenticatedProfile | null> {
  const response = await fetch(`${resolveApiUrl()}/autenticacao/validar`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (response.status === 401) return null;

  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(
      data?.mensagem || `Erro ${response.status}: ${response.statusText}`,
    );
  }

  const profile = data?.dados ?? data?.Dados;
  if (
    (data?.sucesso !== true && data?.success !== true) ||
    !Number.isInteger(Number(profile?.id)) ||
    Number(profile.id) <= 0 ||
    typeof profile?.nome !== "string" ||
    typeof profile?.role !== "string"
  ) {
    throw new Error("A API retornou um perfil de autenticação inválido.");
  }

  return {
    id: Number(profile.id),
    nome: profile.nome,
    role: profile.role,
  };
}

export async function logoutAPI() {
  try {
    await apiCall("/autenticacao/logout", { method: "POST" });
  } finally {
    localStorage.removeItem("restaurant_user");
  }
}

// ============================================
// FUNCIONÁRIOS / USUÁRIOS
// ============================================

export async function getFuncionarios() {
  return apiCall("/funcionario");
}

export async function createFuncionario<T extends object>(data: T) {
  return apiCall("/funcionario", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateFuncionario<T extends object>(id: string, data: T) {
  return apiCall(`/funcionario/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function desativarFuncionario(id: string) {
  return apiCall(`/funcionario/${id}`, { method: "DELETE" });
}

// ============================================
// PRODUTOS
// ============================================

export async function getProdutos() {
  return apiCall("/produto");
}

export async function createProduto<T extends object>(data: T) {
  return apiCall("/produto", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProduto<T extends object>(id: string, data: T) {
  return apiCall(`/produto/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function ajustarEstoque(
  id: string,
  data: { tipo: "ADICIONAR" | "REMOVER"; quantidade: number; motivo: string },
) {
  return apiCall(`/produto/${id}/ajustar-estoque`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ============================================
// PEDIDOS
// ============================================

export async function createPedido<T extends object>(data: T) {
  console.log("[API] POST /pedidos - Enviando:", data);
  const response = await apiCall("/pedidos", {
    method: "POST",
    body: JSON.stringify(data),
  });
  console.log("[API] POST /pedidos - Resposta:", response);
  return response;
}

export async function updatePedido<T extends object>(id: string, data: T) {
  return apiCall(`/pedidos/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function updatePedidoStatus(id: string, status: string) {
  return apiCall(`/pedidos/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

// ============================================
// MESAS
// ============================================

export async function getMesas() {
  return apiCall("/mesa");
}

// ============================================
// CLIENTES
// ============================================

// ============================================
// COMANDAS / ABAS (TABS)
// ============================================

export async function getComandas() {
  console.log("[API] GET /comanda");
  const response = await apiCall("/comanda");
  console.log("[API] GET /comanda - Resposta:", response);
  return response;
}

export async function getLogSistema(pagina = 1, tamanho = 100, filtro = "") {
  const params = new URLSearchParams({ pagina: String(pagina), tamanho: String(tamanho) });
  if (filtro.trim()) params.set("filtro", filtro.trim());
  return apiCall(`/log/sistema?${params.toString()}`);
}

export async function createComanda<T extends object>(data: T) {
  return apiCall("/comanda", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Marca a comanda como inadimplente: fecha sem DETALHE_PAGAMENTO,
 * registra log NAO_PAGO no banco e libera a mesa.
 */
export async function markComandaInadimplente(comandaId: string) {
  return apiCall(`/comanda/${comandaId}/inadimplente`, {
    method: "PUT",
  });
}

export async function pagarComanda(
  comandaId: string,
  data: { idFormaPagamento: number; troco?: number },
) {
  return apiCall(`/comanda/${comandaId}/pagar`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ============================================
// RESERVAS
// ============================================

export async function getReservas() {
  return apiCall("/reserva");
}

export async function createReserva<T extends object>(data: T) {
  return apiCall("/reserva", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteReserva(id: string) {
  return apiCall(`/reserva/${id}`, {
    method: "DELETE",
  });
}

// ============================================
// FATURAMENTO
// ============================================

export async function getFaturamento() {
  return apiCall("/faturamento");
}

export async function getRelatorioFaturamento(dataInicio: string, dataFim: string) {
  const params = new URLSearchParams({ dataInicio, dataFim });
  return apiCall(`/faturamento/relatorio?${params.toString()}`);
}

export async function getReceitaPorForma(dataInicio: string, dataFim: string) {
  const params = new URLSearchParams({ dataInicio, dataFim });
  return apiCall(`/faturamento/receita-por-forma?${params.toString()}`);
}

// ============================================
// FORMAS DE PAGAMENTO
// ============================================

// ============================================
// BACKUP
// ============================================

export async function gerarBackup() {
  return apiCall("/backup/gerar", {
    method: "POST",
  });
}

export async function listarBackups() {
  return apiCall("/backup/listar");
}

export async function restaurarBackup(file: File) {
  const formData = new FormData();
  formData.append("Arquivo", file, file.name);
  const csrfToken = await getCsrfRequestToken();
  const response = await fetch(`${resolveApiUrl()}/backup/restore`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-CSRF-TOKEN": csrfToken,
    },
    body: formData,
  });

  const data = (await parseJsonResponse(response)) ?? {};
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event("auth:unauthorized"));
    throw new Error(data.mensagem || data.message || `Erro ${response.status}: ${response.statusText}`);
  }
  return data;
}

export async function baixarBackup(nomeArquivo: string) {
  const response = await fetch(
    `${resolveApiUrl()}/backup/baixar/${encodeURIComponent(nomeArquivo)}`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error(
      `Erro ao fazer download: ${response.status} ${response.statusText}`,
    );
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
