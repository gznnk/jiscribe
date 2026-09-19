import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// Builds only the canvas viewer (src/viewer). The MCP server itself is bundled
// into dist/index.mjs by build.mjs (esbuild).

/** The host dev:viewer proxies to, at the port it listens on first */
const HOST_ORIGIN = "http://127.0.0.1:5190";

export default defineConfig({
	root: "src/viewer",
	plugins: [react()],
	server: {
		port: 5196,
		proxy: {
			// The file API and the WebSocket go to the host the MCP process starts
			// (5190 by default). The host answers only to its own Host and Origin, so
			// the proxy has to present itself as that page rather than as :5196
			"/api": {
				target: HOST_ORIGIN,
				changeOrigin: true,
				headers: { Origin: HOST_ORIGIN },
			},
			"/ws": {
				target: HOST_ORIGIN.replace("http", "ws"),
				ws: true,
				changeOrigin: true,
				headers: { Origin: HOST_ORIGIN },
			},
		},
	},
	build: {
		// Placed next to the bundled server (dist/index.mjs), which serves it statically
		outDir: "../../dist/client",
		emptyOutDir: true,
	},
});
