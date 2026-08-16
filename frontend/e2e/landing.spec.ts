import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("renders the hero section, headline, and call to actions", async ({ page }) => {
    await page.goto("/");

    // Verify main headline is visible
    await expect(
      page.getByRole("heading", { name: /The AI Code Reviewer/i })
    ).toBeVisible();

    // Verify beta badge is visible
    await expect(page.getByText(/TraceIQ is now in public beta/i)).toBeVisible();

    // Verify action buttons
    const getStartedBtn = page.getByRole("button", { name: /Start Building for Free/i });
    await expect(getStartedBtn).toBeVisible();

    const signInBtn = page.getByRole("button", { name: /Sign In to your Account/i });
    await expect(signInBtn).toBeVisible();
  });

  test("clicking Sign In navigates towards sign-in page", async ({ page }) => {
    await page.goto("/");
    const signInBtn = page.getByRole("button", { name: /Sign In to your Account/i });
    await signInBtn.click();
    await expect(page).toHaveURL(/.*sign-in.*/);
  });
});
