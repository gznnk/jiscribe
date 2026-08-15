/**
 * Browser-side test entry (`@jiscribe/canvas-sdk/testing/harness`): the e2e harness
 * page a plugin's Playwright suite drives, mounted from the plugin's harness entry
 * module. Split off from the other test entries because they pull in @playwright/test,
 * node:child_process and vite, none of which can be bundled into a page.
 */

export * from "@jiscribe/canvas/testing/harness";
