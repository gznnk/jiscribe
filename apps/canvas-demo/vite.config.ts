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
	},
	build: {
		outDir: "dist",
	},
});
