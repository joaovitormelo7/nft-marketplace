import { test, expect, type Page } from "@playwright/test";

async function reset(page: Page) {
  await page.goto("/");
  await expect(page.locator(".nft-card").first()).toBeVisible();
  await page.evaluate(() =>
    fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    }),
  );
  await page.reload();
  await expect(page.locator(".nft-card").first()).toBeVisible();
}
async function demo(page: Page, action: string, value?: string) {
  await page.evaluate(
    ([a, v]) =>
      fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: a, value: v }),
      }),
    [action, value] as const,
  );
}
async function login(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Preencher dados" }).click();
  await page.getByRole("button", { name: "Entrar na conta" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await expect(page.locator(".nft-card").first()).toBeVisible();
}

test.beforeEach(async ({ page }) => reset(page));

test("busca, filtros, ordenação, paginação e histórico", async ({ page }) => {
  if (
    !(await page
      .getByRole("textbox", { name: "Buscar obras ou artistas" })
      .isVisible())
  ) {
    await page.getByRole("link", { name: "Buscar NFTs" }).click();
  }
  await page
    .getByRole("textbox", { name: "Buscar obras ou artistas" })
    .fill("maya");
  await page.getByRole("button", { name: "Pesquisar" }).click();
  await expect(page).toHaveURL(/q=maya/);
  await expect(
    page.getByRole("link", { name: "Emerald Ape #042" }).first(),
  ).toBeVisible();
  const mobile = (page.viewportSize()?.width || 1440) < 761;
  if (mobile) await page.getByRole("button", { name: "Abrir filtros" }).click();
  await page.getByRole("button", { name: "Arte digital", exact: true }).click();
  if (mobile)
    await page.getByRole("button", { name: "Ver resultados" }).click();
  await expect(page).toHaveURL(/category=Arte/);
  await page
    .getByRole("combobox", { name: "Ordenar por" })
    .selectOption("price-desc");
  await expect(page).toHaveURL(/sort=price-desc/);
  await page.goBack();
  await expect(page.getByRole("combobox", { name: "Ordenar por" })).toHaveValue(
    "recent",
  );
  await page
    .locator(".active-filter-summary")
    .getByRole("button", { name: "Limpar filtros" })
    .click();
  if (
    !(await page
      .getByRole("textbox", { name: "Buscar obras ou artistas" })
      .isVisible())
  ) {
    await page.getByRole("link", { name: "Buscar NFTs" }).click();
  }
  await page
    .getByRole("textbox", { name: "Buscar obras ou artistas" })
    .fill("");
  await page.getByRole("button", { name: "Pesquisar" }).click();
  await expect(page.getByRole("button", { name: "Próxima" })).toBeVisible();
  await page.getByRole("button", { name: "Próxima" }).click();
  await expect(page).toHaveURL(/page=2/);
});

test("detalhe direto e NFT inexistente", async ({ page }) => {
  await page.goto("/nft/nft-2");
  await expect(
    page.getByRole("heading", { name: "Sage Nomad #009" }),
  ).toBeVisible();
  await page.goto("/nft/not-real");
  await expect(page.getByRole("alert")).toContainText("NFT não encontrado");
});

test("cadastro em conflito, login e persistência do perfil", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel("Nome completo").fill("Ada Teste");
  await page.getByLabel("E-mail").fill("ada@nexus.test");
  await page.getByLabel("Senha", { exact: true }).fill("Demo123!");
  await page.getByLabel("Confirmar senha").fill("Demo123!");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("alert")).toContainText("já está cadastrado");
  await login(page);
  await page.goto("/profile");
  await page.getByLabel("Nome completo").fill("Ada Atualizada");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.locator(".toast")).toContainText("Perfil atualizado.");
  await page.reload();
  await expect(page.getByLabel("Nome completo")).toHaveValue("Ada Atualizada");
  await page.goto("/wallets");
  await expect(page.getByText("Minha carteira")).toBeVisible();
});

test("carrinho, cupom e persistência após login", async ({ page }) => {
  await page.goto("/nft/nft-1");
  await page.getByRole("button", { name: /Adicionar ao carrinho/ }).click();
  await expect(page.locator(".toast")).toContainText(
    "Obra adicionada ao carrinho.",
  );
  await page.goto("/cart");
  await expect(page.getByText("Emerald Ape #042")).toBeVisible();
  await page.getByLabel("Possui um cupom?").fill("NEXUS10");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText("− 0.119 ETH")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Emerald Ape #042")).toBeVisible();
  await login(page);
  await page.goto("/cart");
  await expect(page.getByText("Emerald Ape #042")).toBeVisible();
});

test("compra completa e recibo congelado", async ({ page }) => {
  await login(page);
  await page.goto("/nft/nft-1");
  await page.getByRole("button", { name: /Adicionar ao carrinho/ }).click();
  await expect(page.locator(".toast")).toContainText(
    "Obra adicionada ao carrinho.",
  );
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Conectar carteira" }).click();
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page).toHaveURL(/orders\/NX-/);
  await expect(page.getByText("Sua nova coleção começa aqui.")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText("1.195 ETH")).toBeVisible();
  await demo(page, "price-up", "nft-1");
  await page.reload();
  await expect(page.getByText("1.195 ETH")).toBeVisible();
});

test("mudança de preço exige nova revisão", async ({ page }) => {
  await login(page);
  await page.goto("/nft/nft-1");
  await page.getByRole("button", { name: /Adicionar ao carrinho/ }).click();
  await expect(page.locator(".toast")).toContainText(
    "Obra adicionada ao carrinho.",
  );
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Conectar carteira" }).click();
  await demo(page, "price-up", "nft-1");
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page.getByRole("alert")).toContainText("cotação mudou");
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(
    page.getByRole("button", { name: "Confirmar compra" }),
  ).toBeVisible();
});

test("rede do catálogo persiste na URL e no refresh", async ({ page }) => {
  const mobile = (page.viewportSize()?.width || 1440) < 761;
  if (mobile) await page.getByRole("button", { name: "Abrir filtros" }).click();
  await page.getByRole("button", { name: "Filtrar por Polygon" }).click();
  if (mobile)
    await page.getByRole("button", { name: "Ver resultados" }).click();
  await expect(page).toHaveURL(/network=Polygon/);
  await expect(page.locator(".active-filter-summary")).toContainText(
    "9 NFTs encontrados",
  );
  await expect(page.locator(".nft-card")).toHaveCount(9);
  await page.reload();
  await expect(page.locator(".nft-card")).toHaveCount(9);
  if (mobile) await page.getByRole("button", { name: "Abrir filtros" }).click();
  await expect(
    page.getByRole("button", { name: "Filtrar por Polygon" }),
  ).toHaveAttribute("aria-pressed", "true");
});
