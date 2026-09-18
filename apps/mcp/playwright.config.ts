// The e2e suite drives the real viewer in a real Chromium against the real host,
// with the real MCP tool layer in the same process. Nothing is mocked and nothing
// is served by vite: the page under test is the built viewer the host serves, which
// is why the build runs in globalSetup rather than a webServer starting beside it.

import { defineConfig } from "@playwright/test";

/**
 * Chromium to drive, when the browser on this machine is not the build Playwright
 * would fetch for itself (a sandbox with the browsers pre-installed at another
 * revision). Left unset, Playwright picks its own, which is what CI does.
 */
const chromiumPath = process.env.JISCRIBE_E2E_CHROMIUM_PATH;

export default defineConfig({
	testDir: "./e2e/specs",
	// The viewer has to be built before the host can serve it, and a missing build
	// would otherwise show up as a blank page rather than as a command to run
	globalSetup: "./e2e/support/buildViewer.ts",
	// Every test brings up a host of its own, and they all take the first free port
	// from the same default. Running them side by side would also put several
	// windows on one canvas host, so they go one at a time
	fullyParallel: false,
	workers: 1,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	// A cold Chromium for the headless viewer, plus the 500ms save debounce and the
	// 300ms file watch, put the longest tests well past Playwright's default
	timeout: 60_000,
	// The html report is what CI uploads, and it is what links the traces under
	// test-results/; list is what makes a local run readable while it goes
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		viewport: { width: 1440, height: 900 },
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		// Test-only hooks go through data-testid, as in every other suite here
		testIdAttribute: "data-testid",
		launchOptions:
			chromiumPath === undefined ? {} : { executablePath: chromiumPath },
	},
	projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
