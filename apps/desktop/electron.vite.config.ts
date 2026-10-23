import { defineConfig } from "electron-vite";
import type { Plugin } from "vite";

import { stageMcpRuntime } from "./stageMcpRuntime.mjs";

/**
 * Stages jiscribe-mcp's runtime files each time the main bundle is written,
 * since that write empties out/main: by `build`, by the dev server, and by
 * `preview` without --skipBuild alike.
 */
const stageMcpRuntimeOnWrite = (): Plugin => ({
	name: "jiscribe-desktop:stage-mcp-runtime",
	writeBundle: async () => {
		await stageMcpRuntime();
	},
});

export default defineConfig({
	main: {
		build: {
			// electron-vite v5 externalizes every entry of `dependencies` by default;
			// bundling them keeps out/ runnable without the workspace's node_modules
			externalizeDeps: false,
		},
		plugins: [stageMcpRuntimeOnWrite()],
		define: {
			// Vite bundles ws's optional native helpers as empty objects, so its
			// `try { require("bufferutil") }` succeeds and the first masked frame of
			// 32 bytes or more throws on `unmask`. These switches make ws use its
			// own JS implementations without trying
			"process.env.WS_NO_BUFFER_UTIL": JSON.stringify("1"),
			"process.env.WS_NO_UTF_8_VALIDATE": JSON.stringify("1"),
		},
	},
	renderer: {},
});
