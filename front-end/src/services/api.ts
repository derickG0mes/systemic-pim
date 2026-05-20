// URL base da API do backend
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Função auxiliar para fazer requisições com o token JWT
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("authToken");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Se tem token, adiciona no header Authorization
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Erro na API:", error);
    throw error;
  }
}

// ============================================
// AUTENTICAÇÃO
// ============================================

export async function loginAPI(email: string, password: string) {
  const response = await fetch(`${API_URL}/autenticacao/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  // O backend retorna { sucesso, dados: { token, nomeUsuario } }
  const token = data.dados?.token || data.token;
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
  try {
    // Tentar o novo endpoint primeiro (apenas abertas)
    console.log("📡 [API] Tentando GET /comanda/abertas/todas");
    const response = await apiCall("/comanda/abertas/todas");
    console.log("📡 [API] GET /comanda/abertas/todas - Resposta:", response);
    return response;
  } catch (error) {
    // Se falhar, tentar o endpoint padrão
    console.warn("⚠️ Erro ao chamar /comanda/abertas/todas, tentando /comanda...", error);
    try {
      const response = await apiCall("/comanda");
      console.log("📡 [API] GET /comanda - Resposta fallback:", response);
      return response;
    } catch (fallbackError) {
      console.error("❌ Ambos os endpoints falharam", fallbackError);
      // Retornar array vazio como último recurso
      console.warn("⚠️ Retornando array vazio como fallback");
      return [];
    }
  }
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

export async function pagarComanda(comandaId: string, data: { idFormaPagamento: number; idFuncionario?: number; troco?: number }) {
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
// HEALTH CHECK (para testar se API está online)
// ============================================

export async function healthCheck() {
  try {
    return await apiCall("/healthcheck");
  } catch (error) {
    return { status: "offline" };
  }
}
