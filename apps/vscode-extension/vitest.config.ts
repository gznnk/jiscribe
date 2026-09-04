import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		// Unit tests are co-located under __tests__. Rendering (the webview's React
		// tree) and the live VSCode API are out of scope here (see docs); these cover
		// the logic extracted away from both — the orchestration in imageDocumentOps
		// and the webview's view-state folding in docViewState.
		include: ["src/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
	},
});
