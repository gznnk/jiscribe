import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// Builds only the canvas viewer (src/viewer). The MCP server itself is bundled
// into dist/index.mjs by build.mjs (esbuild).
export default defineConfig({
	root: "src/viewer",
	plugins: [react()],
	server: {
		port: 5196,
		proxy: {
			// The file API is sent to the host the MCP process starts (5190 by default)
			"/api": "http://localhost:5190",
			"/ws": {
				target: "ws://localhost:5190",
				ws: true,
			},
		},
	},
	build: {
		// Placed next to the bundled server (dist/index.mjs), which serves it statically
		outDir: "../../dist/client",
		emptyOutDir: true,
	},
});
