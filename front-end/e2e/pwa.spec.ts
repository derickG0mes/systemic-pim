import { expect, test } from "@playwright/test";

test("instala o PWA, não armazena a API e mostra o fallback offline", async ({
  page,
  context,
}) => {
  await page.goto("/");

  const manifest = await page.evaluate(async () => {
    const response = await fetch("/manifest.webmanifest");
    return response.json();
  });

  expect(manifest.name).toBe("Systemic");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192" }),
      expect.objectContaining({ sizes: "512x512" }),
      expect.objectContaining({ purpose: "maskable" }),
    ]),
  );
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true);

  const cachedUrls = await page.evaluate(async () => {
    const cacheNames = await caches.keys();
    const requests = await Promise.all(
      cacheNames.map(async (name) => (await caches.open(name)).keys()),
    );
    return requests.flat().map((request) => new URL(request.url).pathname);
  });
  expect(cachedUrls.some((url) => url === "/api" || url.startsWith("/api/"))).toBe(
    false,
  );

  await context.setOffline(true);
  await page.goto("/rota-inexistente-offline");
  await expect(
    page.getByRole("heading", { name: "Você está sem conexão" }),
  ).toBeVisible();
});
