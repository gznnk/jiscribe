// The harness pulls two stylesheets in for their side effect — the canvas's
// @font-face declarations and katex's — which esbuild bundles into harness.css.
// TypeScript has no notion of a CSS import, so it needs telling that these
// specifiers resolve to a module at all.
declare module "*.css";
