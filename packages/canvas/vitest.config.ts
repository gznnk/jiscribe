import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: [
			// ユニットテストはすべて __tests__ に co-located（solitary / sociable を問わない）。
			// プロセス境界を跨ぐ統合検証は E2E（Playwright）側に置く。詳細は docs/09-testing.md。
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
