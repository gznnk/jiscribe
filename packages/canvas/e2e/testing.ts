/**
 * Spec-facing e2e kit (`@jiscribe/canvas/testing`): the Playwright fixtures, canvas
 * driver and DOM selectors the specs are written against. A shape plugin owning its own
 * e2e suite reaches all of it through `@jiscribe/canvas-sdk/testing/e2e`.
 *
 * The kit is one entry per file of a suite, because each of those files is loaded by a
 * different runtime and none of them tolerates the others' imports:
 *
 * - this entry — spec files. Importing it registers Playwright fixtures, which throws
 *   under any other loader, the Playwright config file included.
 * - `./testing/playwright-config` — `playwright.config.ts`.
 * - `./testing/vite-config` — the harness `vite.config.ts`; kept apart from the
 *   Playwright config so loading that config never has to `require()` ESM-only vite.
 * - `./testing/harness` — the harness entry module, which is browser code.
 */

export { test, expect } from "./fixtures";

export { AUTO_SCROLL_MARGIN, CanvasDriver } from "./support/CanvasDriver";
export type { ObjectSnapshot } from "./support/CanvasDriver";

export { selectors } from "./support/selectors";
export type {
	AnchorId,
	ColorSectionId,
	EdgeAnchorId,
	ToolTitle,
} from "./support/selectors";

export {
	dispatchTouch,
	enableTouch,
	flushFrames,
	parseViewBox,
} from "./support/cdpTouch";
export type { TouchPoint } from "./support/cdpTouch";
