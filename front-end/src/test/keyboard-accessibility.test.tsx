import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import AppLayout from "@/components/AppLayout";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

vi.mock("@/contexts/useAuth", () => ({
  useAuth: () => ({
    user: { name: "Teste", role: "admin" },
    logout: vi.fn(),
  }),
}));

afterEach(cleanup);

describe("navegação acessível por teclado", () => {
  it("oferece skip link no início e um destino focável para o conteúdo", () => {
    render(
      <MemoryRouter>
        <AppLayout>Conteúdo principal</AppLayout>
      </MemoryRouter>,
    );

    const skipLink = screen.getByRole("link", { name: "Pular para o conteúdo" });
    const main = document.getElementById("main-content");

    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(main).toHaveAttribute("tabindex", "-1");
    expect(main).toHaveTextContent("Conteúdo principal");
  });

  it("mantém o foco no diálogo, fecha com Escape e devolve o foco ao acionador", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger asChild>
          <button>Abrir diálogo de teste</button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Diálogo de teste</DialogTitle>
          <button>Primeira ação</button>
          <button>Segunda ação</button>
        </DialogContent>
      </Dialog>,
    );

    const trigger = screen.getByRole("button", { name: "Abrir diálogo de teste" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Diálogo de teste" });
    expect(dialog).toBeInTheDocument();

    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
