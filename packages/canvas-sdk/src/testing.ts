/**
 * Unit-test entry (`@jiscribe/canvas-sdk/testing`): suites a shape plugin runs under
 * vitest. Kept out of `.` / `./doc` so no runtime bundle can reach it.
 *
 * A plugin's e2e suite is served by sibling entries — one per file of the suite, because
 * each file is loaded by a different runtime and none of them tolerates the others'
 * imports:
 *
 * - `@jiscribe/canvas-sdk/testing/e2e` — spec files: Playwright fixtures, the canvas
 *   driver, DOM selectors. Importing it registers fixtures, which throws anywhere else.
 * - `@jiscribe/canvas-sdk/testing/playwright-config` — `playwright.config.ts`.
 * - `@jiscribe/canvas-sdk/testing/vite-config` — the harness `vite.config.ts`.
 * - `@jiscribe/canvas-sdk/testing/harness` — the harness entry module (browser code).
 *
 * vitest is imported directly here (devDependency); publishing this package to npm
 * would require making it a peerDependency.
 */

export { createParseCheckSuite } from "./testing/createParseCheckSuite";
export type {
	ParseCheckAcceptCase,
	ParseCheckDoc,
	ParseCheckRejectCase,
	ParseCheckSuiteParams,
} from "./testing/createParseCheckSuite";
