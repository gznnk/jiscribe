import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		// renderMarkdown は DOMPurify.sanitize を通すため window/DOM が必要。
		// node 環境だと DOMPurify が no-op（素通し）になりサニタイズ検証にならない。
		environment: "jsdom",
		include: ["src/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
		coverage: {
			exclude: ["src/index.ts", "vitest.config.ts"],
		},
	},
});
