import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// Vite config for the e2e-only harness, started with an explicit root as `vite e2e/harness`
// from playwright.config.ts's webServer. Dev server only; never built.
export default defineConfig({
	plugins: [react()],
});
