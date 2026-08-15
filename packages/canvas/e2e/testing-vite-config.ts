/**
 * Harness dev-server configuration entry (`@jiscribe/canvas/testing/vite-config`), for
 * the harness `vite.config.ts`. Split from the Playwright config entry so that loading
 * a Playwright config — which Playwright transpiles to CommonJS — never has to
 * `require()` vite, which ships ESM only.
 *
 * Start the harness with `vite --configLoader runner`, so vite processes this entry
 * through its own pipeline. Under the default `bundle` loader a bare specifier is left
 * external and node loads these files itself, which only works where node strips TS
 * types (22.18+).
 */

// Explicit extension: it is what keeps that default-loader path working at all.
export { createPluginHarnessViteConfig } from "./kit/createPluginHarnessViteConfig.ts";
