/**
 * Browser-side e2e kit (`@jiscribe/canvas/testing/harness`): the harness page a
 * Playwright suite drives, mounted from the harness entry module. Kept apart from the
 * other test entries because they reach for @playwright/test, node:child_process and
 * vite, none of which can be bundled into a page.
 */

export { mountPluginHarness } from "./kit/mountPluginHarness";
export type { PluginHarnessParams } from "./kit/mountPluginHarness";
