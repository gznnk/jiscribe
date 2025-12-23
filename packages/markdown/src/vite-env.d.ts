// TODO: CSS import をこのパッケージから削除して apps/web に移動する
// 現在 src/index.ts で直接 CSS を import しているが、
// Vite を使わないライブラリパッケージでは不適切。
// CSS import を削除すれば、この型定義ファイルも不要になる。
// 参照: src/index.ts:8-9
declare module '*.css';
