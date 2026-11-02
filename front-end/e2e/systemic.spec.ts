import { expect, test, type Page } from "@playwright/test";
import { randomBytes, randomInt } from "node:crypto";

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
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login$/);
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

test("admin gera, lista, baixa backup e abre a confirmação de restore", async ({ page }) => {
  await loginAsAdmin(page);
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

  await page.locator('input[type="file"]').setInputFiles({
    name: "backup-de-teste.zip",
    mimeType: "application/zip",
    buffer: Buffer.from("restore confirmation only"),
  });
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Confirmar restauração" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar restauração" })).toBeVisible();
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
  );
  await page.goto("/users");

  const response = await employeesResponse;
  expect(response.ok(), `API returned ${response.status()}`).toBe(true);
  const employeesBody = await expectSuccessful(response);
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
  const financeResponses = [
    page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/faturamento",
    ),
    page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/faturamento/receita-por-forma",
    ),
    page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/faturamento/produtos-mais-vendidos",
    ),
  ];
  await page.goto("/dashboard");

  const [summaryResponse, paymentsResponse, productsResponse] = await Promise.all(financeResponses);
  for (const response of [summaryResponse, paymentsResponse, productsResponse]) {
    expect(response.ok(), `API returned ${response.status()}`).toBe(true);
  }
  const summaryBody = await expectSuccessful(summaryResponse);
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
