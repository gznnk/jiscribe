import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		// Unit tests are co-located under __tests__. Rendering (the webview's React
		// tree) is out of scope here, and so is the live VSCode API — that belongs to
		// e2e/, which runs the same extension inside a real VSCode (pnpm test:e2e)
		// and sits outside src/ for that reason. What is left is the logic extracted
		// away from both — the orchestration in imageDocumentOps, the self-write echo
		// classification in selfWriteTracker, the write ordering in
		// latestWriteSerializer, the panel bookkeeping in webviewBridgeRegistry, and
		// the webview's view-state folding in docViewState.
		include: ["src/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
	},
});
