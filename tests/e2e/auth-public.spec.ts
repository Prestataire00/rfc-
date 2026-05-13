import { expect, test } from "@playwright/test";

test.describe("Accès public — utilisateur non authentifié", () => {
  test("GET / → redirect vers /login", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("GET /dashboard → redirect vers /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("GET /commercial → redirect vers /login", async ({ page }) => {
    await page.goto("/commercial");
    await expect(page).toHaveURL(/\/login/);
  });

  test("GET /espace-client → redirect vers /login", async ({ page }) => {
    await page.goto("/espace-client");
    await expect(page).toHaveURL(/\/login/);
  });

  test("GET /espace-formateur → redirect vers /login", async ({ page }) => {
    await page.goto("/espace-formateur");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Page de login", () => {
  test("affiche le formulaire email/password", async ({ page }) => {
    await page.goto("/login");

    // On utilise getByLabel pour rester résilient à des changements de
    // markup tant que les labels métier ne bougent pas. Si l'app n'utilise
    // pas <label for=…>, les inputs doivent quand même être accessibles
    // par leur name ou leur type — fallback intentionnel ci-dessous.
    const email = page
      .getByLabel(/email/i)
      .or(page.locator("input[type='email'], input[name='email']"));
    const password = page
      .getByLabel(/mot de passe/i)
      .or(page.locator("input[type='password'], input[name='password']"));

    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
  });

  test("affiche un bouton de soumission", async ({ page }) => {
    await page.goto("/login");
    const submit = page
      .getByRole("button", { name: /(se connecter|connexion|sign in|login)/i })
      .or(page.locator("button[type='submit']"));
    await expect(submit.first()).toBeVisible();
  });
});

test.describe("API publiques", () => {
  test("/api/auth/session répond 200 même sans session", async ({ request }) => {
    const response = await request.get("/api/auth/session");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toBeDefined();
  });

  test("/api/utilisateurs (admin only) répond 401 sans auth", async ({ request }) => {
    const response = await request.get("/api/utilisateurs");
    expect([401, 403]).toContain(response.status());
  });
});
