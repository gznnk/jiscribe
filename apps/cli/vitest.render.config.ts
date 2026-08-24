import { defineConfig } from "vitest/config";

// The render tests are kept out of the default suite: each one builds nothing but
// costs a browser launch, and they need `pnpm build:cli` to have run first.
// `pnpm --filter @jiscribe/cli test:render` is what runs them.
export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["render-tests/**/*.test.ts"],
	},
});
