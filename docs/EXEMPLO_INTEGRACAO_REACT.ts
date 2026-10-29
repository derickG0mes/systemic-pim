const API_BASE_URL = `http://${window.location.hostname}:5050/api`;

type ApiEnvelope<T> = {
  sucesso: boolean;
  mensagem: string;
  dados: T;
  codigoErro?: string | null;
};

type EmailLoginData = {
  token: string;
  nomeUsuario: string;
  role: string;
};

type CpfLoginData = {
  idFuncionario: number;
  nomeFuncionario: string;
  token: string;
};

type Produto = {
  idProduto: number;
  nomeProduto: string;
  descricaoProduto: string | null;
  precoProduto: number;
  qtdEstoque: number;
  estoqueMinimo: number;
  statusProduto: string;
  categoriaProduto: string;
  categoria: string;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const responseText = await response.text();
  const data: unknown = responseText ? JSON.parse(responseText) : null;
  if (!response.ok) {
    throw new Error(`API respondeu HTTP ${response.status}`);
  }
  return data as T;
}

export async function loginPorEmail(
  email: string,
  password: string,
): Promise<EmailLoginData> {
  const result = await request<ApiEnvelope<EmailLoginData>>(
    "/autenticacao/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
  localStorage.setItem("authToken", result.dados.token);
  return result.dados;
}

export async function loginPorCpf(
  cpfFuncionario: string,
  senha: string,
): Promise<CpfLoginData> {
  const result = await request<CpfLoginData>("/funcionario/login", {
    method: "POST",
    body: JSON.stringify({ cpfFuncionario, senha }),
  });
  localStorage.setItem("authToken", result.token);
  return result;
}

export async function listarProdutos(): Promise<ApiEnvelope<Produto[]>> {
  return request<ApiEnvelope<Produto[]>>("/produto");
}
