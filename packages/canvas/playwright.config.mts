import { createServer } from "node:net";

import { defineConfig } from "@playwright/test";

// Only for headed runs (--headed / --ui), switch to serial execution (workers: 1) plus
// slowMo so the run is easy to follow by eye.
// (Whether to pause after a test is decided in the worker from
//  testInfo.project.use.headless, because process.argv only carries --headed in this
//  main process.)
const isHeaded =
	process.argv.includes("--headed") || process.argv.includes("--ui");

// Take the port for the e2e-only server from a free OS port (the ephemeral range) on
// every run. A fixed port would collide with a dev server (dev:examples / dev:web, ...)
// and would also rule out running several e2e suites at once.
// This config is re-evaluated in each worker process, so the port picked first is burned
// into PLAYWRIGHT_PORT and shared with every process (otherwise baseURL and the port the
// webServer starts on would drift apart per worker, giving ERR_CONNECTION_REFUSED).
const port = process.env.PLAYWRIGHT_PORT
	? Number(process.env.PLAYWRIGHT_PORT)
	: await new Promise<number>((resolve, reject) => {
			const probe = createServer();
			probe.on("error", reject);
			probe.listen(0, "127.0.0.1", () => {
				const address = probe.address();
				const freePort =
					typeof address === "object" && address ? address.port : 0;
				probe.close(() => resolve(freePort));
			});
		});
process.env.PLAYWRIGHT_PORT = String(port);

export default defineConfig({
	testDir: "./e2e/specs",
	fullyParallel: !isHeaded,
	workers: isHeaded ? 1 : undefined,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL: `http://localhost:${port}`,
		viewport: { width: 1440, height: 900 },
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		// Test-only hooks go through data-testid (data-kind / data-id are kept separate, as they are functional contracts)
		testIdAttribute: "data-testid",
		// In headed Chromium, reading the clipboard raises a permission popup that stalls the
		// test. Granting the permission suppresses it (harmless in headless too).
		permissions: ["clipboard-read", "clipboard-write"],
		launchOptions: isHeaded ? { slowMo: 500 } : {},
	},
	webServer: {
		// Pin the free port we grabbed with strictPort. If it escaped to another port it
		// would no longer match baseURL and every test would fail to connect, so fail fast
		// instead of letting it drift.
		command: `pnpm dev:harness --port ${port} --strictPort`,
		port,
		// The port changes per run, so do not reuse (a dedicated server is started and torn down each time).
		reuseExistingServer: false,
	},
});
