import type { Point } from "@workspace/geometry";

/**
 * 点列を SVG `<polyline>` / `<polygon>` の `points` 属性文字列
 * （`"x,y x,y ..."`）へ変換する。空配列は空文字列を返す。
 */
export const toPointsAttr = (points: readonly Point[]): string =>
	points.map((p) => `${p.x},${p.y}`).join(" ");
