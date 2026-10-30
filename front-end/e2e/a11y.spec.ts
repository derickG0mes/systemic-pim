import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const screens = [
  { path: "/dashboard", heading: "Dashboard" },
  { path: "/orders", heading: "Pedidos" },
  { path: "/tabs", heading: "Comandas" },
  { path: "/inventory", heading: "Estoque & Produtos" },
  { path: "/users", heading: "Gestão de Usuários" },
  { path: "/backup", heading: "Backup do Sistema" },
  { path: "/accessibility", heading: "Acessibilidade" },
];

async function installApiMocks(page: Page, authenticated: boolean) {
  const fulfillJson = (route: Route, status: number, body: object) =>
    route.fulfill({
      status,
      headers: {
        "Access-Control-Allow-Origin": baseUrl,
        "Access-Control-Allow-Credentials": "true",
      },
      json: body,
    });

  await page.addInitScript(() => {
    localStorage.setItem("systemic:accessibility:vlibras", "false");
  });
  await page.route("**/api/**", async (route: Route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": baseUrl,
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Accept, Content-Type, X-CSRF-TOKEN",
        },
      });
      return;
    }

    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/autenticacao/validar")) {
      if (!authenticated) {
        await fulfillJson(route, 401, { sucesso: false });
        return;
      }

      await fulfillJson(route, 200, {
        sucesso: true,
        dados: { id: 1, nome: "A11y", role: "admin" },
      });
      return;
    }

    if (pathname.endsWith("/produto")) {
      await fulfillJson(route, 200, {
          sucesso: true,
          dados: [{
            idProduto: 1,
            nomeProduto: "Produto acessível",
            categoria: "Bebidas",
            precoProduto: 10,
            qtdEstoque: 20,
            estoqueMinimo: 2,
          }, {
            idProduto: 2,
            nomeProduto: "Outro produto acessível",
            categoria: "Carnes",
            precoProduto: 20,
            qtdEstoque: 5,
            estoqueMinimo: 1,
          }],
      });
      return;
    }

    if (pathname.endsWith("/funcionario")) {
      await fulfillJson(route, 200, {
          sucesso: true,
          dados: [{
            idFuncionario: 1,
            nomeFuncionario: "Usuário de teste",
            emailFuncionario: "teste@example.invalid",
            cpfFuncionario: "00000000000",
            telefoneFuncionario: "",
            cargoFuncionario: "Teste",
            role: "admin",
            statusFuncionario: "ATIVO",
          }],
      });
      return;
    }

    await fulfillJson(route, 200, { sucesso: true, dados: [] });
  });
}

async function seriousViolations(page: Page) {
  await page.evaluate(async () => {
    const animations = document.getAnimations().filter(
      (animation) =>
        animation.playState === "running" &&
        animation.effect?.getComputedTiming().iterations !== Infinity,
    );
    await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
  });

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  return results.violations
    .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        summary: node.failureSummary,
      })),
    }));
}

test("axe não encontra violações serious/critical nas oito telas exigidas", async ({ context }) => {
  test.setTimeout(120000);
  const findings: Array<{ screen: string; violations: Awaited<ReturnType<typeof seriousViolations>> }> = [];

  const loginPage = await context.newPage();
  await installApiMocks(loginPage, false);
  await loginPage.goto(new URL("/login", baseUrl).toString());
  await expect(loginPage.getByRole("heading", { name: "Systemic" })).toBeVisible();
  findings.push({ screen: "/login", violations: await seriousViolations(loginPage) });
  await loginPage.close();

  const page = await context.newPage();
  await installApiMocks(page, true);
  for (const screen of screens) {
    await page.goto(new URL(screen.path, baseUrl).toString());
    await expect(page.getByRole("heading", { name: screen.heading, exact: true })).toBeVisible();
    findings.push({ screen: screen.path, violations: await seriousViolations(page) });
  }

  await page.goto("/inventory");
  await page.getByRole("button", { name: "Produto", exact: true }).click();
  findings.push({ screen: "/inventory (cadastro)", violations: await seriousViolations(page) });

  await page.goto("/users");
  await page.getByRole("button", { name: "Novo Usuário" }).click();
  findings.push({ screen: "/users (cadastro)", violations: await seriousViolations(page) });

  const failures = findings.filter((finding) => finding.violations.length > 0);
  expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
});

test("Tab percorre menu e tabelas em ordem, com foco visível e sem armadilha", async ({ page }) => {
  await installApiMocks(page, true);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Pular para o conteúdo" });
  await expect(skipLink).toBeFocused();
  const skipOutline = await skipLink.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(skipOutline).not.toBe("none");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeFocused();
  for (let index = 0; index < 10; index += 1) {
    await page.keyboard.press("Tab");
  }
  await expect(page.getByRole("button", { name: "Sair" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Abrir ou fechar menu lateral" })).toBeFocused();

  await page.goto("/inventory");
  const adjustmentButtons = page.getByRole("button", { name: "Ajustar", exact: true });
  await expect(adjustmentButtons).toHaveCount(2);
  await adjustmentButtons.first().focus();
  await page.keyboard.press("Tab");
  await expect(adjustmentButtons.nth(1)).toBeFocused();
  const tableOutline = await adjustmentButtons.nth(1).evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(tableOutline).not.toBe("none");
  await page.keyboard.press("Tab");
  await expect(adjustmentButtons.nth(1)).not.toBeFocused();

  await page.goto("/users");
  const editButton = page.getByRole("button", { name: "Editar Usuário de teste" });
  await editButton.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Desativar" })).toBeFocused();
});
