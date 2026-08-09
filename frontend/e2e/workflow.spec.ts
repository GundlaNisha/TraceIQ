import { test, expect } from "@playwright/test";

// This entire test suite runs against USE_MOCK = true
// — no live backend required. It validates the full UI workflow.

test.describe("TraceIQ full workflow (mock mode)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("login redirects to dashboard", async ({ page }) => {
    await page.getByRole("button", { name: "Sign in (mock)" }).click();
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByText("Dashboard")).toBeVisible();
  });

  test("can add a repository and see it animate through sync states", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Sign in (mock)" }).click(); // mock login
    await page.goto("/repositories");
    await expect(page.getByText("Repositories")).toBeVisible();

    await page.getByRole("button", { name: "Add Repository" }).click();
    await page.fill("input[id='repo_url']", "https://github.com/test/repo");
    await page.getByRole("button", { name: "Connect" }).click();

    // Should see the new repo in the list with Pending status
    await expect(page.getByText("Pending")).toBeVisible({ timeout: 3000 });
    // After ~5 seconds in mock mode it should reach Ready
    await expect(page.getByText("Ready")).toBeVisible({ timeout: 10000 });
  });

  test("can create a requirement and see it in the list", async ({ page }) => {
    await page.click("button[type='submit']");
    await page.goto("/requirements");

    await page.getByRole("button", { name: "New Requirement" }).click();
    await page.fill("input[id='title']", "Test requirement");
    await page.locator("select[id='repository_id']").selectOption({ index: 1 });
    await page.fill(
      "textarea[id='text']",
      "This is a detailed test requirement with more than 10 chars.",
    );
    await page.getByRole("button", { name: "Create Requirement" }).click();

    await expect(page.getByText("Test requirement")).toBeVisible({
      timeout: 3000,
    });
  });

  test("navigate to analysis page and see progress bar advance", async ({
    page,
  }) => {
    await page.click("button[type='submit']");
    await page.goto("/analysis/job_1");

    // Progress bar should be visible initially (job starts at queued/running)
    await expect(page.locator(".bg-blue-500")).toBeVisible({ timeout: 5000 });

    // After polling advances the mock job, results should appear
    await expect(page.getByText("Impacted Files")).toBeVisible({
      timeout: 20000,
    });
    await expect(
      page.getByText("src/services/payments/charge.py"),
    ).toBeVisible();
  });

  test("PR draft editor renders with preview", async ({ page }) => {
    await page.click("button[type='submit']");
    await page.goto("/pr-drafts/draft_1");

    await expect(page.getByText("Editor")).toBeVisible();
    await expect(page.getByText("Preview")).toBeVisible();
    await expect(page.getByText("AI Generated")).toBeVisible();

    // Edit content and verify unsaved indicator
    const textarea = page.getByPlaceholder("PR description markdown...");
    await textarea.fill("# Edited content\n\nSome new text.");
    await expect(page.getByText("Unsaved changes")).toBeVisible();

    // Save
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved ✓")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("Edited")).toBeVisible();
  });
});
