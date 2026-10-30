import { expect, test, type Page, type Route } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:8080";

async function installApiMocks(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("systemic:accessibility:vlibras", "false");
  });
  await page.route("**/api/**", async (route: Route) => {
    const corsHeaders = {
      "Access-Control-Allow-Origin": baseUrl,
      "Access-Control-Allow-Credentials": "true",
    };
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          ...corsHeaders,
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Accept, Content-Type, X-CSRF-TOKEN",
        },
      });
      return;
    }

    const isProfileRequest = new URL(route.request().url()).pathname.endsWith(
      "/autenticacao/validar",
    );
    await route.fulfill({
      status: 200,
      headers: corsHeaders,
      json: isProfileRequest
        ? { sucesso: true, dados: { id: 1, nome: "A11y", role: "admin" } }
        : { sucesso: true, dados: [] },
    });
  });
}

async function openAccessibilityPage(page: Page) {
  await installApiMocks(page);
  await page.goto(new URL("/accessibility", baseUrl).toString());
  await expect(page.getByRole("heading", { name: "Acessibilidade" })).toBeVisible();
}

test("controle de fonte percorre quatro níveis, anuncia e persiste", async ({ page }) => {
  await openAccessibilityPage(page);
  const currentSize = page.getByLabel("Tamanho atual da fonte");
  const increase = page.getByRole("button", { name: "Aumentar tamanho da fonte" });
  const decrease = page.getByRole("button", { name: "Diminuir tamanho da fonte" });

  await expect(currentSize).toHaveText("100%");
  await increase.click();
  await expect(currentSize).toHaveText("125%");
  await expect(page.locator('p[role="status"]')).toHaveText("Tamanho da fonte alterado para 125%.");
  await increase.click();
  await expect(currentSize).toHaveText("150%");
  await expect(increase).toBeDisabled();
  await decrease.click();
  await decrease.click();
  await decrease.click();
  await expect(currentSize).toHaveText("90%");
  await expect(decrease).toBeDisabled();
  await expect.poll(() => page.evaluate(() => ({
    inlineSize: document.documentElement.style.fontSize,
    savedSize: localStorage.getItem("systemic:accessibility:font-size"),
  }))).toEqual({ inlineSize: "90%", savedSize: "90" });

  await page.reload();
  await expect(currentSize).toHaveText("90%");
  await expect.poll(() => page.evaluate(() => document.documentElement.style.fontSize))
    .toBe("90%");
});

test("seletor de tema persiste claro, escuro e alto contraste com razão mínima 7:1", async ({ page }) => {
  await openAccessibilityPage(page);
  const lightTheme = page.getByRole("button", { name: "Tema claro" });
  const darkTheme = page.getByRole("button", { name: "Tema escuro" });
  const highContrastTheme = page.getByRole("button", { name: "Tema alto contraste" });

  await expect(lightTheme).toHaveAttribute("aria-pressed", "true");
  await darkTheme.click();
  await expect(darkTheme).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("theme-dark")))
    .toBe(true);

  await lightTheme.click();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("theme-dark")))
    .toBe(false);
  await highContrastTheme.click();
  await expect(highContrastTheme).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('p[role="status"]')).toHaveText("Tema alto contraste ativado.");

  const ratios = await page.evaluate(() => {
    const luminance = (color: string) => {
      const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
      if (!channels || channels.length !== 3) throw new Error("Expected an RGB color.");
      const linear = channels.map((channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    const contrast = (foreground: string, background: string) => {
      const foregroundLuminance = luminance(foreground);
      const backgroundLuminance = luminance(background);
      return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
        (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
    };
    const body = getComputedStyle(document.body);
    const highContrastButton = document.querySelector(
      'button[aria-label="Tema alto contraste"]',
    );
    if (!(highContrastButton instanceof HTMLElement)) {
      throw new Error("High contrast theme control was not found.");
    }
    const buttonStyle = getComputedStyle(highContrastButton);
    return {
      bodyText: contrast(body.color, body.backgroundColor),
      primaryButton: contrast(buttonStyle.color, buttonStyle.backgroundColor),
    };
  });
  expect(ratios.bodyText).toBeGreaterThanOrEqual(7);
  expect(ratios.primaryButton).toBeGreaterThanOrEqual(7);

  await expect.poll(() => page.evaluate(() => localStorage.getItem("systemic:accessibility:theme")))
    .toBe("high-contrast");
  await page.reload();
  await expect(highContrastTheme).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("theme-high-contrast")))
    .toBe(true);
});
