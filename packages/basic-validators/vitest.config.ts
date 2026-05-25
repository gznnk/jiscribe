import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
		coverage: {
			exclude: ["src/index.ts", "vitest.config.ts"],
		},
	},
});
