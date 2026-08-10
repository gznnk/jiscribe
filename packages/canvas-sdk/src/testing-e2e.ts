/**
 * Spec-facing test entry (`@jiscribe/canvas-sdk/testing/e2e`): the Playwright fixtures,
 * canvas driver and DOM selectors a shape plugin's specs are written against. Import it
 * from spec files only — importing it registers Playwright fixtures, which throws under
 * any other loader, `playwright.config.ts` included.
 */

export * from "@jiscribe/canvas/testing";
