/**
 * 図形の色（stroke / fontColor / fill）が「テーマに従う（未指定）」状態であることを示す
 * sentinel 値。具体色と同じ string フィールドに `"auto"` として保存され、ポータビリティを
 * 損なわない（「テーマに従う」という曖昧さのない意味を持つ）。
 *
 * 描画時に `presentations` 側の `resolveAutoColor` で `currentColor`（= テーマ前景）へ
 * 解決される。データ層・State 層では `"auto"` のまま保持する（保存値を壊さないため）。
 */
export const AUTO_COLOR = "auto";

/** 色の値が auto sentinel（テーマ追従）かどうかを判定する。 */
export const isAutoColor = (value: unknown): value is typeof AUTO_COLOR =>
	value === AUTO_COLOR;
