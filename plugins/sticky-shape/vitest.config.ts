import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: [
			// ユニットテストはすべて __tests__ に co-located（solitary / sociable を問わない）。
			// canvas の分類方針（docs/09-testing.md）に合わせる。
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
