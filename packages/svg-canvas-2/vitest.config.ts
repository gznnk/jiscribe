import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: [
			// __tests__ = ユニットテスト / __integration__ = 結合テスト（canvasReducer 経由など）
			"src/**/__tests__/**/*.{test,spec}.{ts,tsx}",
			"src/**/__integration__/**/*.{test,spec}.{ts,tsx}",
		],
		coverage: {
			exclude: ["src/**/index.ts", "vitest.config.ts"],
		},
	},
});
