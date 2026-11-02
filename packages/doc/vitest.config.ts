import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
		setupFiles: ["./vitest.setup.ts"],
		benchmark: {
			// Measured, never judged: `bench` is kept apart from `test`
			// (packages/canvas/docs/09-testing.md).
			include: ["src/**/__benchmarks__/**/*.bench.ts"],
		},
		coverage: {
			exclude: ["src/**/index.ts", "vitest.config.ts", "vitest.setup.ts"],
		},
	},
});
