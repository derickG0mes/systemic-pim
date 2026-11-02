import { expect, test, type Locator, type Page } from "@playwright/test";
import { randomBytes, randomInt } from "node:crypto";
import { readFile } from "node:fs/promises";

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const apiUrl = process.env.E2E_API_URL ?? "http://localhost:5050/api";

test.skip(
  !email || !password,
  "Configure E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD for the test admin.",
);

async function loginAsAdmin(page: Page) {
  if (!email || !password) {
    throw new Error("E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be configured.");
  }
  await page.goto("/login");
  await page.getByPlaceholder("E-mail").fill(email);
  await page.getByPlaceholder("Senha").fill(password);
  const loginResponse = page.waitForResponse((response) =>
    response.request().method() === "POST" &&
    new URL(response.url()).pathname === "/api/autenticacao/login",
  );
  await page.getByRole("button", { name: "Entrar" }).click();
  const response = await loginResponse;
  expect(response.ok(), `Login API returned ${response.status()}`).toBe(true);
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 15_000 });
}

async function expectSuccessful(response: {
  ok(): boolean;
  status(): number;
  text(): Promise<string>;
}): Promise<Record<string, unknown>> {
  const body = await response.text();
  expect(response.ok(), `API returned ${response.status()}: ${body}`).toBe(true);
  return body ? JSON.parse(body) as Record<string, unknown> : {};
}

async function createApiClient(page: Page) {
  const csrfResponse = await page.request.get(`${apiUrl}/autenticacao/csrf`);
  const csrfBody = await expectSuccessful(csrfResponse);
  const requestToken = csrfBody.requestToken;
  if (typeof requestToken !== "string") {
    throw new Error("The API did not return a CSRF request token.");
  }

  const send = async (
    method: "GET" | "POST" | "DELETE",
    path: string,
    data?: object,
  ) => {
    const response = await page.request.fetch(`${apiUrl}${path}`, {
      method,
      headers: { "X-CSRF-TOKEN": requestToken },
      data,
    });
    return expectSuccessful(response);
  };

  return { send };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : null;
}

function getEntityId(body: Record<string, unknown>, key: string): number {
  const responseData = asRecord(body.dados) ?? asRecord(body.Dados);
  const data = asRecord(responseData?.dados) ?? asRecord(responseData?.Dados) ?? responseData;
  const id = Number(data?.[key]);
  expect(Number.isInteger(id) && id > 0, `Response did not contain ${key}`).toBe(true);
  return id;
}

async function expectNoMobilePageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function expectFullyInViewport(locator: Locator, page: Page) {
  await expect(locator).toBeVisible();
  const bounds = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.width);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
}

test("admin restaura backup e recupera os dados do marcador", async ({ page }) => {
  // Gerar e restaurar um backup completo pode exceder o timeout padrão do teste.
  test.setTimeout(180_000);
  await loginAsAdmin(page);
  const api = await createApiClient(page);
  const suffix = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const markerName = `Marcador backup E2E ${suffix}`;
  const markerEmail = `e2e-backup-${suffix}@teste.local`;
  const markerCpf = Array.from({ length: 11 }, () => randomInt(10)).join("");
  const markerPassword = randomBytes(32).toString("base64");
  let markerId: number | undefined;

  try {
    await page.goto("/users");
    await expect(page.getByRole("heading", { name: "Gestão de Usuários" })).toBeVisible();
    await page.getByRole("button", { name: "Novo Usuário" }).click();

    const createDialog = page.getByRole("dialog");
    await createDialog.getByLabel("Nome").fill(markerName);
    await createDialog.getByLabel("CPF (11 dígitos)").fill(markerCpf);
    await createDialog.getByLabel("E-mail").fill(markerEmail);
    await createDialog.getByLabel("Cargo").fill("Marcador E2E");
    await createDialog.getByLabel("Senha (mínimo 6 caracteres)").fill(markerPassword);

    const createResponse = page.waitForResponse((response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/funcionario",
    ).then(async (response) => ({ response, body: await response.text() }));
    await createDialog.getByRole("button", { name: "Cadastrar" }).click();
    const created = await createResponse;
    expect(created.response.status(), created.body).toBe(201);
    const createdBody = created.body
      ? JSON.parse(created.body) as Record<string, unknown>
      : {};
    markerId = getEntityId(createdBody, "idFuncionario");

    const markerRow = page.getByRole("row").filter({ hasText: markerEmail });
    await expect(markerRow.getByText(markerName, { exact: true })).toBeVisible();

    await page.goto("/backup");
    await expect(page.getByRole("heading", { name: "Backup do Sistema" })).toBeVisible();

    const generatedResponse = page.waitForResponse((response) =>
      response.request().method() === "POST" &&
      response.url().endsWith("/api/backup/gerar"),
    );
    await page.getByRole("button", { name: "Gerar Backup Agora" }).click();
    const generatedBody = await expectSuccessful(await generatedResponse);
    const generatedData = asRecord(generatedBody.dados);
    const backupName = generatedData?.nomeArquivo;
    expect(typeof backupName).toBe("string");
    if (typeof backupName !== "string") {
      throw new Error("The backup endpoint did not return a filename.");
    }
    expect(backupName).toMatch(/\.zip$/i);

    await expect(page.getByRole("heading", { name: "Backups Existentes" })).toBeVisible();
    const backupNameText = page.getByText(backupName, { exact: true });
    await expect(backupNameText).toBeVisible();
    const backupRow = backupNameText.locator("xpath=../..");

    const downloadEvent = page.waitForEvent("download");
    await backupRow.getByRole("button", { name: "Baixar" }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe(backupName);
    expect(await download.failure()).toBeNull();
    const downloadPath = await download.path();
    if (!downloadPath) {
      throw new Error("The generated backup download has no local file.");
    }
    const backupBuffer = await readFile(downloadPath);

    await page.goto("/users");
    const currentMarkerRow = page.getByRole("row").filter({ hasText: markerEmail });
    await expect(currentMarkerRow).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    const deactivateResponse = page.waitForResponse((response) =>
      response.request().method() === "DELETE" &&
      new URL(response.url()).pathname === `/api/funcionario/${markerId}`,
    );
    await currentMarkerRow.getByRole("button", { name: "Desativar" }).click();
    expect((await deactivateResponse).status()).toBe(200);
    await expect(currentMarkerRow.getByText("Inativo", { exact: true })).toBeVisible();

    await page.goto("/backup");
    await page.getByLabel("Arquivo ZIP para restaurar").setInputFiles({
      name: backupName,
      mimeType: "application/zip",
      buffer: backupBuffer,
    });
    await page.getByRole("button", { name: "Restaurar", exact: true }).click();
    const confirmDialog = page.getByRole("dialog");
    await expect(confirmDialog.getByRole("heading", { name: "Confirmar restauração" })).toBeVisible();

    // O restore reescreve todas as tabelas em uma transação e pode exceder o timeout padrão.
    const restoreResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/backup/restore",
      { timeout: 120_000 },
    ).then(async (response) => ({
      response,
      body: await response.text(),
    }));
    await confirmDialog.getByRole("button", { name: "Confirmar restauração" }).click();
    const restored = await restoreResponse;
    expect(restored.response.status(), restored.body).toBe(200);
    const restoreBody = restored.body
      ? JSON.parse(restored.body) as Record<string, unknown>
      : {};
    expect(restoreBody.sucesso).toBe(true);

    const sessionResponse = await page.request.get(`${apiUrl}/autenticacao/validar`);
    if (sessionResponse.status() === 401) {
      await page.evaluate(() => localStorage.removeItem("restaurant_user"));
      await loginAsAdmin(page);
    } else {
      expect(sessionResponse.status()).toBe(200);
    }

    await page.goto("/users");
    const restoredMarkerRow = page.getByRole("row").filter({ hasText: markerEmail });
    await expect(restoredMarkerRow.getByText(markerName, { exact: true })).toBeVisible();
    await expect(restoredMarkerRow.getByText("Ativo", { exact: true })).toBeVisible();
  } finally {
    if (markerId) {
      await api.send("DELETE", `/funcionario/${markerId}`);
    }
  }
});

test("pedido novo aparece na cozinha via SignalR sem recarregar", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/orders");
  await expect(page.getByRole("status").getByText("Tempo real ativo")).toBeVisible();

  const api = await createApiClient(page);
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  let mesaId: number | undefined;
  let clienteId: number | undefined;
  let produtoId: number | undefined;
  let comandaId: number | undefined;

  try {
    const mesa = await api.send("POST", "/mesa", {
      numeroMesa: 10000 + Math.floor(Math.random() * 80000),
      capacidadeMesa: 4,
      statusMesa: "DISPONIVEL",
    });
    mesaId = getEntityId(mesa, "idMesa");

    const cliente = await api.send("POST", "/cliente", {
      nomeCliente: `E2E cliente ${suffix}`,
    });
    clienteId = getEntityId(cliente, "idCliente");

    const produto = await api.send("POST", "/produto", {
      nomeProduto: `E2E pedido ${suffix}`,
      descricaoProduto: "Produto criado pelo teste E2E",
      precoProduto: 1.25,
      qtdEstoque: 10,
      estoqueMinimo: 1,
      categoria: "BEBIDA",
    });
    produtoId = getEntityId(produto, "idProduto");

    const documentNavigations: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) documentNavigations.push(frame.url());
    });

    const pedido = await api.send("POST", "/pedidos", {
      idMesa: mesaId,
      idCliente: clienteId,
      itens: [{ idProduto: produtoId, qtdProduto: 1, precoUnitarioPago: 1.25 }],
    });
    comandaId = getEntityId(pedido, "idComanda");

    await expect(page.getByText(`1x E2E pedido ${suffix}`, { exact: true })).toBeVisible({
      timeout: 15000,
    });
    expect(documentNavigations).toHaveLength(0);
    await expect(page.getByRole("status").getByText("Tempo real ativo")).toBeVisible();
  } finally {
    if (comandaId) {
      const detail = await api.send("GET", `/comanda/${comandaId}`);
      const detailData = asRecord(detail.dados) ?? asRecord(detail.Dados);
      const comanda = asRecord(detailData?.dados) ?? asRecord(detailData?.Dados) ?? detailData;
      const items = Array.isArray(comanda?.itensComanda) ? comanda.itensComanda : [];
      for (const item of items) {
        const itemId = Number(asRecord(item)?.idItemComanda);
        if (Number.isInteger(itemId) && itemId > 0) {
          await api.send("DELETE", `/comanda/${comandaId}/itens/${itemId}`);
        }
      }
      await api.send("DELETE", `/comanda/${comandaId}`);
    }

    if (produtoId) await api.send("DELETE", `/produto/${produtoId}`);
    if (clienteId) await api.send("DELETE", `/cliente/${clienteId}`);
    if (mesaId) await api.send("DELETE", `/mesa/${mesaId}`);
  }
});

test("admin carrega funcionários e abre o formulário de cadastro", async ({ page }) => {
  await loginAsAdmin(page);
  const employeesResponse = page.waitForResponse((response) =>
    response.request().method() === "GET" &&
    new URL(response.url()).pathname === "/api/funcionario",
  ).then(async (response) => ({ response, body: await response.text() }));
  await page.goto("/users");

  const { response, body } = await employeesResponse;
  expect(response.ok(), `API returned ${response.status()}: ${body}`).toBe(true);
  const employeesBody = body ? JSON.parse(body) as Record<string, unknown> : {};
  const employees = employeesBody.dados ?? employeesBody.Dados;
  expect(Array.isArray(employees)).toBe(true);
  await expect(page.getByRole("heading", { name: "Gestão de Usuários" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Funcionários" })).toBeVisible();
  await expect(page.getByText("Carregando funcionários...")).toHaveCount(0);

  await page.getByRole("button", { name: "Novo Usuário" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Novo funcionário" })).toBeVisible();
});

test("admin cadastra, edita e inativa funcionário", async ({ page }) => {
  await loginAsAdmin(page);
  const api = await createApiClient(page);
  const suffix = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const email = `e2e-${suffix}@teste.local`;
  const initialName = `Funcionário E2E ${suffix}`;
  const updatedName = `Funcionário E2E atualizado ${suffix}`;
  const cpf = Array.from({ length: 11 }, () => randomInt(10)).join("");
  const employeePassword = randomBytes(32).toString("base64");
  let employeeId: number | undefined;
  let deactivated = false;

  try {
    await page.goto("/users");
    await expect(page.getByRole("heading", { name: "Gestão de Usuários" })).toBeVisible();
    await page.getByRole("button", { name: "Novo Usuário" }).click();

    const createDialog = page.getByRole("dialog");
    await createDialog.getByLabel("Nome").fill(initialName);
    await createDialog.getByLabel("CPF (11 dígitos)").fill(cpf);
    await createDialog.getByLabel("E-mail").fill(email);
    await createDialog.getByLabel("Cargo").fill("E2E");
    await createDialog.getByLabel("Senha (mínimo 6 caracteres)").fill(employeePassword);

    const createResponse = page.waitForResponse((response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/funcionario",
    );
    await createDialog.getByRole("button", { name: "Cadastrar" }).click();
    const created = await createResponse;
    expect(created.status()).toBe(201);
    const createdBody = await expectSuccessful(created);
    employeeId = getEntityId(createdBody, "idFuncionario");

    const employeeRow = page.getByRole("row").filter({ hasText: email });
    await expect(employeeRow).toBeVisible();
    await expect(employeeRow.getByText(initialName, { exact: true })).toBeVisible();

    await employeeRow.getByRole("button", { name: `Editar ${initialName}` }).click();
    const editDialog = page.getByRole("dialog");
    await expect(editDialog.getByRole("heading", { name: "Editar funcionário" })).toBeVisible();
    await editDialog.getByLabel("Nome").fill(updatedName);
    const updateResponse = page.waitForResponse((response) =>
      response.request().method() === "PUT" &&
      new URL(response.url()).pathname === `/api/funcionario/${employeeId}`,
    );
    await editDialog.getByRole("button", { name: "Salvar alterações" }).click();
    expect((await updateResponse).status()).toBe(200);
    await expect(employeeRow.getByText(updatedName, { exact: true })).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    const deactivateResponse = page.waitForResponse((response) =>
      response.request().method() === "DELETE" &&
      new URL(response.url()).pathname === `/api/funcionario/${employeeId}`,
    );
    await employeeRow.getByRole("button", { name: "Desativar" }).click();
    expect((await deactivateResponse).status()).toBe(200);
    await expect(employeeRow.getByText("Inativo", { exact: true })).toBeVisible();
    deactivated = true;
  } finally {
    if (employeeId && !deactivated) {
      await api.send("DELETE", `/funcionario/${employeeId}`);
    }
  }
});

test("admin carrega os dados de faturamento do dashboard", async ({ page }) => {
  await loginAsAdmin(page);
  const summaryResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/faturamento",
  ).then(async (response) => ({ response, body: await response.text() }));
  const financeResponses = [
    summaryResponse,
    page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/faturamento/receita-por-forma",
    ),
    page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/faturamento/produtos-mais-vendidos",
    ),
  ];
  await page.goto("/dashboard");

  const [{ response: summaryApiResponse, body: summaryText }, paymentsResponse, productsResponse] =
    await Promise.all(financeResponses);
  for (const response of [summaryApiResponse, paymentsResponse, productsResponse]) {
    expect(response.ok(), `API returned ${response.status()}`).toBe(true);
  }
  const summaryBody = summaryText ? JSON.parse(summaryText) as Record<string, unknown> : {};
  const summary = asRecord(summaryBody.dados) ?? asRecord(summaryBody.Dados);
  const revenue = Number(summary?.receita);
  const expenses = Number(summary?.despesas);
  const profit = Number(summary?.lucro);
  expect(Number.isFinite(revenue) && Number.isFinite(expenses) && Number.isFinite(profit)).toBe(true);

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  const dailySalesCard = page.getByText("Vendas do Dia").locator("xpath=../../..");
  await expect(dailySalesCard).toBeVisible();
  await expect(dailySalesCard.getByText(`R$ ${revenue.toFixed(2)}`, { exact: true })).toBeVisible();
  await expect(page.getByText("Produtos Mais Vendidos")).toBeVisible();
  await expect(page.getByText("Erro", { exact: true })).toHaveCount(0);
});

test("admin navega pelas telas principais no mobile sem overflow horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await loginAsAdmin(page);

  const menuButton = page.getByRole("button", { name: "Abrir ou fechar menu lateral" });
  const navigateFromMobileMenu = async (
    menuLabel: string,
    heading: string,
    primaryAction: Locator,
  ) => {
    await menuButton.click();
    const mobileMenu = page.getByRole("dialog", { name: "Menu de navegação" });
    await expect(mobileMenu).toBeVisible();
    await mobileMenu.getByRole("link", { name: menuLabel, exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(mobileMenu).toHaveCount(0);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expectNoMobilePageOverflow(page);
    await expectFullyInViewport(primaryAction, page);
  };

  await navigateFromMobileMenu(
    "Dashboard",
    "Dashboard",
    page.getByText("Vendas do Dia", { exact: true }),
  );
  await navigateFromMobileMenu(
    "Usuários",
    "Gestão de Usuários",
    page.getByRole("button", { name: "Novo Usuário" }),
  );
  await navigateFromMobileMenu(
    "Estoque",
    "Estoque & Produtos",
    page.getByRole("button", { name: "Produto", exact: true }),
  );
  await navigateFromMobileMenu(
    "Backup",
    "Backup do Sistema",
    page.getByRole("button", { name: "Gerar Backup Agora" }),
  );
  await navigateFromMobileMenu(
    "Pedidos",
    "Pedidos",
    page.getByRole("button", { name: "Criar Novo Pedido" }),
  );
});

test("widget VLibras carrega no painel de acessibilidade", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/accessibility");
  await expect.poll(async () => page.evaluate(() => {
    const script = document.getElementById("vlibras-plugin-script") as HTMLScriptElement | null;
    return script?.dataset.loadState;
  }), { timeout: 20000 }).toBe("loaded");
  await expect.poll(() => page.evaluate(() => {
    const windowWithVLibras = window as Window & {
      VLibras?: { Widget: unknown };
    };
    return typeof windowWithVLibras.VLibras?.Widget;
  }))
    .toBe("function");
  await expect(page.getByRole("status").getByText("VLibras indisponível no momento."))
    .toHaveCount(0);
});

test("avisa quando o script VLibras falha", async ({ page }) => {
  await page.route("https://vlibras.gov.br/app/vlibras-plugin.js", (route) => route.abort());
  await loginAsAdmin(page);
  await expect(page.getByRole("status").getByText("VLibras indisponível no momento."))
    .toBeVisible();
});
