import type { Point } from "@workspace/geometry";

/** これより近い連続点どうしは同一とみなして畳む距離（px）。 */
const COINCIDENT_EPSILON = 0.5;

/**
 * 連続するほぼ同一の点を畳んだ新しい点列を返す。
 *
 * 折れ線コネクターでは、陳腐な経由点（旧バージョンが書き込んだ端点座標など）が
 * 端点と重なることがある。そのまま描くと長さ 0 のセグメントが生まれ、端の矢印角度が
 * 退化してしまう。直前の点との距離が `COINCIDENT_EPSILON` 以下の点は捨て、実質的な
 * 折れ線（重なりのケースでは直線）へ戻す。
 *
 * 直前の点とだけ比較するため、離れたあと再び同じ座標へ戻る点は畳まれず残る。
 * 入力は変更せず、各点も新しいオブジェクトとして複製して返す。
 */
export const dedupePoints = (points: readonly Point[]): Point[] => {
	const result: Point[] = [];
	for (const p of points) {
		const last = result[result.length - 1];
		if (!last || Math.hypot(p.x - last.x, p.y - last.y) > COINCIDENT_EPSILON) {
			result.push({ x: p.x, y: p.y });
		}
	}
	return result;
};
