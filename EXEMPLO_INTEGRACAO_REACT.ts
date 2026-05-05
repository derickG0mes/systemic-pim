/**
 * EXEMPLO DE INTEGRAÇÃO REACT COM API
 * 
 * Copie e adapte esse código para seu projeto React
 */

import axios from "axios";

// ========================================
// 1. CONFIGURAÇÃO BASE DO AXIOS
// ========================================

const API_BASE_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ========================================
// 2. SERVIÇO DE AUTENTICAÇÃO
// ========================================

export const authService = {
  async login(cpf: string, senha: string) {
    try {
      const response = await api.post("/funcionario/login", {
        cpfFuncionario: cpf,
        senha: senha,
      });

      // Armazenar token no localStorage
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("userId", response.data.idFuncionario);
      localStorage.setItem("userName", response.data.nomeFuncionario);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Erro ao fazer login");
    }
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
  },

  isAuthenticated() {
    return !!localStorage.getItem("token");
  },

  getToken() {
    return localStorage.getItem("token");
  },
};

// ========================================
// 3. SERVIÇO DE FUNCIONÁRIOS
// ========================================

export const funcionarioService = {
  async getAll() {
    const response = await api.get("/funcionario");
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/funcionario/${id}`);
    return response.data;
  },

  async create(nome: string, cpf: string, telefone: string, senha: string) {
    const response = await api.post("/funcionario", {
      nomeFuncionario: nome,
      cpfFuncionario: cpf,
      telefoneFuncionario: telefone,
      senha: senha,
    });
    return response.data;
  },

  async update(
    id: number,
    nome: string,
    telefone: string,
    senha?: string
  ) {
    const response = await api.put(`/funcionario/${id}`, {
      nomeFuncionario: nome,
      telefoneFuncionario: telefone,
      senha: senha,
    });
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/funcionario/${id}`);
  },
};

// ========================================
// 4. SERVIÇO DE CLIENTES
// ========================================

export const clienteService = {
  async getAll() {
    const response = await api.get("/cliente");
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/cliente/${id}`);
    return response.data;
  },

  async create(
    nome: string,
    telefone?: string,
    feedback?: string
  ) {
    const response = await api.post("/cliente", {
      nomeCliente: nome,
      telefoneCliente: telefone || "",
      feedback: feedback,
    });
    return response.data;
  },

  async update(
    id: number,
    nome: string,
    telefone?: string,
    feedback?: string
  ) {
    const response = await api.put(`/cliente/${id}`, {
      nomeCliente: nome,
      telefoneCliente: telefone,
      feedback: feedback,
    });
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/cliente/${id}`);
  },
};

// ========================================
// 5. SERVIÇO DE MESAS
// ========================================

export const mesaService = {
  async getAll() {
    const response = await api.get("/mesa");
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/mesa/${id}`);
    return response.data;
  },

  async create(numero: number, capacidade: number) {
    const response = await api.post("/mesa", {
      numeroMesa: numero,
      capacidadeMesa: capacidade,
      statusMesa: "DISPONIVEL",
    });
    return response.data;
  },

  async updateStatus(id: number, status: string) {
    const response = await api.put(`/mesa/${id}`, {
      statusMesa: status,
    });
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/mesa/${id}`);
  },
};

// ========================================
// 6. SERVIÇO DE PRODUTOS
// ========================================

export const produtoService = {
  async getAll() {
    const response = await api.get("/produto");
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/produto/${id}`);
    return response.data;
  },

  async create(
    nome: string,
    descricao: string,
    qtd: number
  ) {
    const response = await api.post("/produto", {
      nomeProduto: nome,
      descricaoProduto: descricao,
      qtdEstoque: qtd,
      statusProduto: "DISPONIVEL",
    });
    return response.data;
  },

  async update(
    id: number,
    nome: string,
    descricao: string,
    qtd: number
  ) {
    const response = await api.put(`/produto/${id}`, {
      nomeProduto: nome,
      descricaoProduto: descricao,
      qtdEstoque: qtd,
    });
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/produto/${id}`);
  },
};

// ========================================
// 7. SERVIÇO DE COMANDAS
// ========================================

export const comandaService = {
  async getAll() {
    const response = await api.get("/comanda");
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/comanda/${id}`);
    return response.data;
  },

  async create(idMesa: number, idCliente: number) {
    const response = await api.post("/comanda", {
      idMesa,
      idCliente,
    });
    return response.data;
  },

  async addItem(idComanda: number, idProduto: number, qtd: number, preco: number) {
    const response = await api.post(`/comanda/${idComanda}/itens`, {
      idProduto,
      qtdProduto: qtd,
      precoUnitarioPago: preco,
    });
    return response.data;
  },

  async close(id: number) {
    const response = await api.put(`/comanda/${id}/fechar`);
    return response.data;
  },

  async getTotal(id: number) {
    const response = await api.get(`/comanda/${id}/total`);
    return response.data.total;
  },

  async delete(id: number) {
    await api.delete(`/comanda/${id}`);
  },
};

// ========================================
// 8. SERVIÇO DE FATURAMENTO
// ========================================

export const faturamentoService = {
  async getRelatorio(dataInicio: string, dataFim: string) {
    const response = await api.get("/faturamento/relatorio", {
      params: { dataInicio, dataFim },
    });
    return response.data;
  },

  async getReceitaPorForma(dataInicio: string, dataFim: string) {
    const response = await api.get("/faturamento/receita-por-forma", {
      params: { dataInicio, dataFim },
    });
    return response.data;
  },

  async getDespesaPorCategoria(dataInicio: string, dataFim: string) {
    const response = await api.get("/faturamento/despesa-por-categoria", {
      params: { dataInicio, dataFim },
    });
    return response.data;
  },

  async addDespesa(descricao: string, valor: number, categoria: string, idFormaPagamento: number) {
    const response = await api.post("/faturamento/despesa", {
      descricaoDespesa: descricao,
      valorDespesa: valor,
      categoriaDespesa: categoria,
      idFormaPagamento,
    });
    return response.data;
  },

  async getDespesas(dataInicio: string, dataFim: string) {
    const response = await api.get("/faturamento/despesas", {
      params: { dataInicio, dataFim },
    });
    return response.data;
  },
};

// ========================================
// 9. EXEMPLO DE USO EM UM COMPONENTE REACT
// ========================================

/*
import { useState, useEffect } from "react";
import { authService, clienteService } from "./api";

function LoginPage() {
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.login(cpf, senha);
      // Redirecionar para dashboard
      window.location.href = "/dashboard";
    } catch (error: any) {
      setErro(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="text"
        placeholder="CPF"
        value={cpf}
        onChange={(e) => setCpf(e.target.value)}
      />
      <input
        type="password"
        placeholder="Senha"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
      />
      {erro && <p style={{ color: "red" }}>{erro}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

function ClientesPage() {
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const data = await clienteService.getAll();
        setClientes(data);
      } catch (error) {
        console.error("Erro ao carregar clientes:", error);
      }
    };

    fetchClientes();
  }, []);

  return (
    <div>
      <h2>Clientes</h2>
      <ul>
        {clientes.map((cliente) => (
          <li key={cliente.idCliente}>{cliente.nomeCliente}</li>
        ))}
      </ul>
    </div>
  );
}
*/

export default api;
