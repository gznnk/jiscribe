import react from "@vitejs/plugin-react-swc";
import { defineConfig, type UserConfig } from "vite";

/**
 * Vite configuration for an e2e-only harness, started with an explicit root as
 * `vite e2e/harness` from the `webServer` of a Playwright config. Dev server only;
 * never built.
 *
 * @returns A config to `export default`; the harness root stays on the command line, so nothing here is suite-specific.
 */
export function createPluginHarnessViteConfig(): UserConfig {
	return defineConfig({
		plugins: [react()],
	});
}
