import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: [
			// Every unit test is co-located in __tests__, solitary and sociable alike.
			// Integration checks that cross a process boundary live in the E2E suite
			// (Playwright). See docs/09-testing.md for the details.
			"src/**/__tests__/**/*.{test,spec}.{ts,tsx}",
			// The build-time helpers (build/) sit outside src but are tested the same way.
			"build/**/__tests__/**/*.{test,spec}.{ts,tsx}",
		],
		setupFiles: ["./vitest.setup.ts"],
		coverage: {
			exclude: [
				...coverageConfigDefaults.exclude,
				"src/**/index.ts",
				"vitest.config.ts",
				"vitest.setup.ts",
			],
		},
	},
});
