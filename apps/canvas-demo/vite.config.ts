import { execSync } from "child_process";

import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

const gitBranch = (() => {
	try {
		return execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
	} catch {
		return "unknown";
	}
})();

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	define: {
		__GIT_BRANCH__: JSON.stringify(gitBranch),
	},
	server: {
		port: 5174,
		// コンテナ内では 0.0.0.0 にバインドしないとホストへ publish しても届かない
		host: process.env.DEVCONTAINER === "true" || undefined,
	},
	build: {
		outDir: "dist",
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (!id.includes("node_modules")) {
						return undefined;
					}
					if (id.includes("/react/") || id.includes("/react-dom/")) {
						return "react";
					}
					if (id.includes("/katex/")) {
						return "katex";
					}
					if (
						id.includes("/highlight.js/") ||
						id.includes("/markdown-it") ||
						id.includes("/dompurify/")
					) {
						return "markdown";
					}
					return undefined;
				},
			},
		},
	},
});
