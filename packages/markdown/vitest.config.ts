import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		// renderMarkdown runs its output through DOMPurify.sanitize, so it needs window/DOM.
		// In a node environment DOMPurify becomes a no-op (it passes input straight
		// through), which would make the sanitizing tests meaningless.
		environment: "jsdom",
		include: ["src/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
		coverage: {
			exclude: ["src/index.ts", "vitest.config.ts"],
		},
	},
});
