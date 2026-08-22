import { createRequire } from "node:module";
import { sep } from "node:path";

import { createPluginHarnessViteConfig } from "@jiscribe/canvas/testing/vite-config";

/**
 * Repository root the `@fontsource` files actually live under.
 *
 * This harness is the one that imports `@jiscribe/canvas/fonts.css`, whose face
 * files come out of the package store rather than out of any source tree. Vite
 * finds a workspace root of its own and refuses to serve anything above it,
 * which in a checkout where the engine is a submodule is the engine directory —
 * one level below the store the fonts resolve into. So the store's own root is
 * computed instead: resolve one face through the canvas package that depends on
 * it, and cut the path at the outermost `node_modules`.
 */
const packageStoreRoot = createRequire(
	createRequire(import.meta.url).resolve("@jiscribe/canvas/fonts.css"),
)
	.resolve("@fontsource/source-sans-3/400.css")
	.split(`${sep}node_modules${sep}`)[0];

export default {
	...createPluginHarnessViteConfig(),
	server: { fs: { allow: [packageStoreRoot] } },
};
