import { afterEach, describe, expect, it, vi } from "vitest";
import { createFuncionario, loginAPI } from "@/services/api";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("proteção CSRF", () => {
  it("renova o token depois que o login altera a identidade da sessão", async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/autenticacao/csrf")) {
        const authenticated = fetchMock.mock.calls.some(([request]) =>
          String(request).endsWith("/autenticacao/login"),
        );
        return jsonResponse({
          requestToken: authenticated ? "csrf-autenticado" : "csrf-anonimo",
        });
      }
      if (url.endsWith("/autenticacao/login")) {
        return jsonResponse({ sucesso: true });
      }
      return jsonResponse({ sucesso: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    await loginAPI("test@example.com", "password");
    await createFuncionario({ nome: "Teste" });

    const csrfRequests = fetchMock.mock.calls.filter(([request]) =>
      String(request).endsWith("/autenticacao/csrf"),
    );
    expect(csrfRequests).toHaveLength(2);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      headers: expect.objectContaining({ "X-CSRF-TOKEN": "csrf-anonimo" }),
    });
    expect(fetchMock.mock.calls[3][1]).toMatchObject({
      headers: expect.objectContaining({ "X-CSRF-TOKEN": "csrf-autenticado" }),
    });
  });
});
