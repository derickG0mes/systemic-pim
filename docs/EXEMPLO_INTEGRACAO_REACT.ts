const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:5050/api`;

type ApiEnvelope<T> = {
  sucesso: boolean;
  mensagem: string;
  dados: T;
  codigoErro?: string | null;
};

type LoginData = {
  id: number;
  nomeUsuario: string;
  role: string;
};

type Produto = {
  idProduto: number;
  nomeProduto: string;
  precoProduto: number;
};

let csrfRequestToken: string | null = null;

async function getCsrfRequestToken(): Promise<string> {
  if (csrfRequestToken) return csrfRequestToken;

  const response = await fetch(`${API_BASE_URL}/autenticacao/csrf`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const data = (await response.json()) as { requestToken?: string };
  if (!response.ok || typeof data.requestToken !== "string") {
    throw new Error("Não foi possível obter o token CSRF.");
  }

  csrfRequestToken = data.requestToken;
  return csrfRequestToken;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    headers.set("X-CSRF-TOKEN", await getCsrfRequestToken());
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`API respondeu HTTP ${response.status}`);
  }
  return data as T;
}

export async function loginPorEmail(
  email: string,
  password: string,
): Promise<ApiEnvelope<LoginData>> {
  return request<ApiEnvelope<LoginData>>("/autenticacao/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<ApiEnvelope<null>> {
  return request<ApiEnvelope<null>>("/autenticacao/logout", {
    method: "POST",
  });
}

export async function listarProdutos(): Promise<ApiEnvelope<Produto[]>> {
  return request<ApiEnvelope<Produto[]>>("/produto");
}
