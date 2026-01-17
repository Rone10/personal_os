import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environmentMatchGlobs: [
      // Use edge-runtime for Convex tests (convex-test requirement)
      ["convex/**", "edge-runtime"],
      // Use node for non-Convex tests
      ["**", "node"],
    ],
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next", "convex/_generated"],
    server: {
      deps: {
        inline: ["convex-test"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
