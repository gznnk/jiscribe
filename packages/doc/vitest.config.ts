import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
		setupFiles: ["./vitest.setup.ts"],
		coverage: {
			exclude: ["src/**/index.ts", "vitest.config.ts", "vitest.setup.ts"],
		},
	},
});
