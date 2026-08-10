import { execFileSync } from "node:child_process";

import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

/** Suite-specific inputs of {@link createCanvasPlaywrightConfig}. */
export type CanvasPlaywrightConfigParams = {
	/**
	 * Playwright's `testDir`, resolved against the config file's directory
	 * (`"./e2e/specs"` for a suite laid out like the canvas one).
	 */
	testDir: string;
	/**
	 * Builds the shell command that starts the harness dev server, called with the
	 * port this run settled on. The command must pin that exact port
	 * (`--port ${port} --strictPort`), because `baseURL` is already fixed to it.
	 */
	harnessCommand: (port: number) => string;
};

// Node's only free-port probe is listening on port 0, which is asynchronous, while a
// Playwright config file has no way to await: Playwright transpiles it to CommonJS. (An
// ESM .mts config could top-level await, but it cannot then take named exports from this
// module, which Playwright hands it as CommonJS.) So the probe runs to completion in a
// child node process instead.
const FREE_PORT_PROBE_SCRIPT = `
const probe = require("node:net").createServer();
probe.on("error", (error) => {
	console.error(error);
	process.exit(1);
});
probe.listen(0, "127.0.0.1", () => {
	const { port } = probe.address();
	probe.close(() => process.stdout.write(String(port)));
});
`;

/** A port nobody is listening on, taken from the OS ephemeral range. */
function findFreePort(): number {
	return Number(
		execFileSync(process.execPath, ["-e", FREE_PORT_PROBE_SCRIPT], {
			encoding: "utf8",
		}),
	);
}

/**
 * The Playwright configuration every canvas e2e suite shares: a harness dev server
 * on a per-run ephemeral port, the 1440x900 viewport and clipboard grant the specs
 * are written against, and serial + slowMo execution under a headed run.
 *
 * @param params - The two things a suite owns; everything else is fixed so all suites behave alike. See {@link CanvasPlaywrightConfigParams}.
 * @returns The object to `export default` from a `playwright.config.ts`.
 */
export function createCanvasPlaywrightConfig(
	params: CanvasPlaywrightConfigParams,
): PlaywrightTestConfig {
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
		: findFreePort();
	process.env.PLAYWRIGHT_PORT = String(port);

	return defineConfig({
		testDir: params.testDir,
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
			command: params.harnessCommand(port),
			port,
			// The port changes per run, so do not reuse (a dedicated server is started and torn down each time).
			reuseExistingServer: false,
		},
	});
}
