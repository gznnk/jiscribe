import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		setupFiles: ["./vitest.setup.ts"],
		include: [
			// Every unit test is co-located in __tests__, solitary and sociable alike.
			// This follows the canvas classification policy (docs/09-testing.md).
			"src/**/__tests__/**/*.{test,spec}.{ts,tsx}",
		],
		coverage: {
			exclude: [
				...coverageConfigDefaults.exclude,
				"src/**/index.ts",
				"vitest.config.ts",
			],
		},
	},
});
