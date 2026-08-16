import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
  },
  webServer: {
    command: "npm run dev -- -H 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
        "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k",
      CLERK_SECRET_KEY:
        process.env.CLERK_SECRET_KEY || "sk_test_mock_clerk_secret_key",
      NEXT_PUBLIC_BACKEND_URL:
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000",
    },
  },
});
