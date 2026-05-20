const currentHost = window.location.hostname;
export const API_URL = `http://${currentHost}:5050/api`;

function resolveApiUrl(): string {
  return API_URL;
}

const PUBLIC_PATHS = ["/autenticacao/login", "/healthcheck"];

export function getAuthToken(): string | null {
  const token = localStorage.getItem("authToken");
  return token?.trim() ? token.trim() : null;
}

function isPublicPath(endpoint: string): boolean {
  return PUBLIC_PATHS.some((p) => endpoint.startsWith(p));
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

// Função auxiliar: token lido do localStorage no instante de cada requisição
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const needsAuth = !isPublicPath(endpoint);

  if (needsAuth && !token) {
    const err = new Error(
      `[API] ${endpoint} — não autenticado (token ausente)`,
    );
    console.error(err.message);
    throw err;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${resolveApiUrl()}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();

  if (!response.ok) {
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
  const response = await fetch(`${resolveApiUrl()}/autenticacao/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = (await parseJsonResponse(response)) ?? {};

  if (!response.ok) {
    throw new Error(
      data.mensagem || `Erro ${response.status}: ${response.statusText}`,
    );
  }

  const token = data.dados?.token || data.Dados?.token || data.token;
  if (token) {
    localStorage.setItem("authToken", token);
  }

  return data;
}

export function logoutAPI() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("restaurant_user");
}

// ============================================
// FUNCIONÁRIOS / USUÁRIOS
// ============================================

export async function getFuncionarios() {
  return apiCall("/funcionario");
}

export async function getFuncionarioById(id: string) {
  return apiCall(`/funcionario/${id}`);
}

export async function createFuncionario(data: any) {
  return apiCall("/funcionario", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateFuncionario(id: string, data: any) {
  return apiCall(`/funcionario/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ============================================
// PRODUTOS
// ============================================

export async function getProdutos() {
  return apiCall("/produto");
}

export async function getProdutoById(id: string) {
  return apiCall(`/produto/${id}`);
}

export async function createProduto(data: any) {
  return apiCall("/produto", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProduto(id: string, data: any) {
  return apiCall(`/produto/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteProduto(id: string) {
  return apiCall(`/produto/${id}`, {
    method: "DELETE",
  });
}

// ============================================
// PEDIDOS
// ============================================

export async function getPedidos() {
  return apiCall("/pedidos");
}

export async function getPedidoById(id: string) {
  return apiCall(`/pedidos/${id}`);
}

export async function createPedido(data: any) {
  console.log("📡 [API] POST /pedidos - Enviando:", data);
  const response = await apiCall("/pedidos", {
    method: "POST",
    body: JSON.stringify(data),
  });
  console.log("📡 [API] POST /pedidos - Resposta:", response);
  return response;
}

export async function updatePedido(id: string, data: any) {
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

export async function deletePedido(id: string) {
  return apiCall(`/pedidos/${id}`, {
    method: "DELETE",
  });
}

// ============================================
// MESAS
// ============================================

export async function getMesas() {
  return apiCall("/mesa");
}

export async function getMesaById(id: string) {
  return apiCall(`/mesa/${id}`);
}

export async function createMesa(data: any) {
  return apiCall("/mesa", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMesa(id: string, data: any) {
  return apiCall(`/mesa/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ============================================
// CLIENTES
// ============================================

export async function getClientes() {
  return apiCall("/cliente");
}

export async function getClienteById(id: string) {
  return apiCall(`/cliente/${id}`);
}

export async function createCliente(data: any) {
  return apiCall("/cliente", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ============================================
// COMANDAS / ABAS (TABS)
// ============================================

export async function getComandas() {
  console.log("📡 [API] GET /comanda");
  const response = await apiCall("/comanda");
  console.log("📡 [API] GET /comanda - Resposta:", response);
  return response;
}

export async function getLogSistema(pagina = 1, tamanho = 100) {
  return apiCall(`/log/sistema?pagina=${pagina}&tamanho=${tamanho}`);
}

export async function getComandasByTable(tableNumber: number) {
  return apiCall(`/comanda/mesa/${tableNumber}`);
}

export async function createComanda(data: any) {
  return apiCall("/comanda", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateComanda(id: string, data: any) {
  return apiCall(`/comanda/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function addItemComanda(comandaId: string, itemData: any) {
  return apiCall(`/comanda/${comandaId}/itens`, {
    method: "POST",
    body: JSON.stringify(itemData),
  });
}

export async function removeItemComanda(comandaId: string, itemId: string) {
  return apiCall(`/comanda/${comandaId}/itens/${itemId}`, {
    method: "DELETE",
  });
}

export async function closeComanda(comandaId: string) {
  return apiCall(`/comanda/${comandaId}/fechar`, {
    method: "PUT",
  });
}

export async function pagarComanda(
  comandaId: string,
  data: { idFormaPagamento: number; idFuncionario?: number; troco?: number },
) {
  return apiCall(`/comanda/${comandaId}/pagar`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteComanda(comandaId: string) {
  return apiCall(`/comanda/${comandaId}`, {
    method: "DELETE",
  });
}

// ============================================
// RESERVAS
// ============================================

export async function getReservas() {
  return apiCall("/reserva");
}

export async function createReserva(data: any) {
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

// ============================================
// FORMAS DE PAGAMENTO
// ============================================

export async function getFormasPagamento() {
  return apiCall("/formapagamento");
}

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

export async function baixarBackup(nomeArquivo: string) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const response = await fetch(
    `${resolveApiUrl()}/backup/baixar/${encodeURIComponent(nomeArquivo)}`,
    {
      headers,
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

// ============================================
// HEALTH CHECK (para testar se API está online)
// ============================================

export async function healthCheck() {
  return apiCall("/healthcheck");
}
