import { describe, expect, it } from "vitest";
import { formatApiErrorMessage } from "@/services/api";

describe("formatApiErrorMessage", () => {
  it("uses the API message for conflict responses", () => {
    expect(formatApiErrorMessage(JSON.stringify({
      sucesso: false,
      mensagem: "E-mail já cadastrado.",
    }))).toBe("E-mail já cadastrado.");
  });

  it("formats field validation errors instead of showing the raw problem JSON", () => {
    expect(formatApiErrorMessage(JSON.stringify({
      title: "One or more validation errors occurred.",
      errors: {
        NomeCliente: ["Nome do cliente deve ter no máximo 100 caracteres."],
      },
    }))).toBe("NomeCliente: Nome do cliente deve ter no máximo 100 caracteres.");
  });
});
