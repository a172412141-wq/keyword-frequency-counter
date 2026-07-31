import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.git/**",
      ".pnpm-store/**",
      "amazon-review-public/**",
    ],
  },
});
