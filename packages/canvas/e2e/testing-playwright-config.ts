/**
 * Playwright configuration entry (`@jiscribe/canvas/testing/playwright-config`), for
 * `playwright.config.ts` and nothing else. It stays clear of `@jiscribe/canvas/testing`
 * on purpose: Playwright rejects a config that reaches a module registering fixtures.
 */

export { createCanvasPlaywrightConfig } from "./kit/createCanvasPlaywrightConfig";
export type { CanvasPlaywrightConfigParams } from "./kit/createCanvasPlaywrightConfig";
