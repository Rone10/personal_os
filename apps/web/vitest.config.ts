import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    alias: [
      { find: "@/convex", replacement: path.resolve(__dirname, "../backend/convex") },
      { find: "@", replacement: path.resolve(__dirname, "./") },
    ],
  },
});
