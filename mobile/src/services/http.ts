export class ApiError extends Error {
  readonly status: number;
  readonly codigoErro?: string;
  readonly retryAfter?: string;

  constructor(message: string, status: number, codigoErro?: string, retryAfter?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.codigoErro = codigoErro;
    this.retryAfter = retryAfter;
  }
}

type RequestOptions = RequestInit & {
  notifyUnauthorized?: boolean;
};

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function clearCsrfToken() {
  csrfToken = null;
  csrfRequest = null;
}

export function getApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
  if (!configuredUrl) {
    throw new Error("Configure EXPO_PUBLIC_API_URL com a URL da API terminando em /api.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error("EXPO_PUBLIC_API_URL não é uma URL válida.");
  }

  if (!parsedUrl.pathname.replace(/\/+$/, "").endsWith("/api")) {
    throw new Error("EXPO_PUBLIC_API_URL deve apontar para a base /api.");
  }
  return configuredUrl;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError("A API retornou uma resposta JSON inválida.", response.status);
  }
}

function getErrorDetails(payload: unknown) {
  if (!payload || typeof payload !== "object") return {};
  const body = payload as Record<string, unknown>;
  return {
    message:
      (typeof body.mensagem === "string" && body.mensagem) ||
      (typeof body.message === "string" && body.message) ||
      (typeof body.title === "string" && body.title) ||
      undefined,
    codigoErro: typeof body.codigoErro === "string" ? body.codigoErro : undefined,
  };
}

export function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const body = payload as Record<string, unknown>;
    if (body.sucesso === false || body.success === false) {
      const { message, codigoErro } = getErrorDetails(payload);
      throw new ApiError(message ?? "A operação não foi concluída pela API.", 400, codigoErro);
    }
    if ("dados" in body) return body.dados as T;
    if ("Dados" in body) return body.Dados as T;
  }
  return payload as T;
}

export async function getCsrfRequestToken(forceRefresh = false): Promise<string> {
  if (forceRefresh) clearCsrfToken();
  if (csrfToken) return csrfToken;
  if (csrfRequest) return csrfRequest;

  csrfRequest = (async () => {
    const response = await fetch(`${getApiBaseUrl()}/autenticacao/csrf`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const payload = await readJson(response);
    const token =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>).requestToken
        : undefined;
    if (!response.ok || typeof token !== "string") {
      const details = getErrorDetails(payload);
      throw new ApiError(details.message ?? "Não foi possível obter o token CSRF.", response.status);
    }
    csrfToken = token;
    return token;
  })();

  try {
    return await csrfRequest;
  } finally {
    csrfRequest = null;
  }
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    headers.set("X-CSRF-TOKEN", await getCsrfRequestToken());
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
  const payload = await readJson(response);

  if (!response.ok) {
    if (response.status === 401 && options.notifyUnauthorized !== false) {
      unauthorizedHandler?.();
    }
    const details = getErrorDetails(payload);
    const retryAfter = response.headers.get("Retry-After") ?? undefined;
    const wait =
      response.status === 429
        ? retryAfter
          ? ` Aguarde ${retryAfter} segundos e tente novamente.`
          : " Aguarde um momento e tente novamente."
        : "";
    throw new ApiError(
      `${details.message ?? `Falha na API (HTTP ${response.status}).`}${wait}`,
      response.status,
      details.codigoErro,
      retryAfter,
    );
  }

  return unwrap<T>(payload);
}
