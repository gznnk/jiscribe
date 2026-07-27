// Webview のバンドル（esbuild）は CSS の import を dist/webview.css へまとめるが、
// tsc は CSS の import を解決できないため副作用 import として宣言する。
// 対象は KaTeX のスタイル（src/webview/index.tsx）。
declare module "*.css";
