// The webview bundle (esbuild) collects CSS imports into dist/webview.css, but tsc cannot
// resolve a CSS import, so they are declared as side-effect imports here.
// This covers the KaTeX styles (src/webview/index.tsx).
declare module "*.css";
