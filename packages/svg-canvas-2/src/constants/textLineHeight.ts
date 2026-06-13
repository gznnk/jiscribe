/**
 * Line height shared by text display (TextOverlay) and text editing (TextEditor).
 *
 * textarea はフォーム要素のため line-height を祖先から継承せず UA デフォルト
 * （normal ≈ 1.2）になる。一方 div は継承するため、明示しないとホストアプリの
 * グローバル CSS 次第で表示と編集の行送りがズレる。両者に同じ値を明示することで
 * 編集中もテキスト位置が一致する。
 */
export const TEXT_LINE_HEIGHT = 1.5;
