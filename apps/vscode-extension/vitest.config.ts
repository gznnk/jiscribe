import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		// Unit tests are co-located under __tests__. The webview and the live VSCode
		// API are out of scope here (see docs); these cover the VSCode-free
		// orchestration extracted into imageDocumentOps.
		include: ["src/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
	},
});
