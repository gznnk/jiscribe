import { EPSILON } from "../common/EPSILON";

/**
 * 数値座標版の線分交差判定。`doSegmentsIntersect` の計算コアで、Point を一切確保しない。
 * ホットパス（`isLineIntersectingBox` の 4 辺判定やルーティングの経路再計算）から
 * 中間オブジェクトのアロケーション無しで呼べるよう、座標をそのまま受け取る。
 *
 * 平行・共線は常に非交差。非平行のとき `inclusive` で端点接触を交差に含めるか制御する。
 *
 * @param p1x - 第 1 線分の始点 x
 * @param p1y - 第 1 線分の始点 y
 * @param p2x - 第 1 線分の終点 x
 * @param p2y - 第 1 線分の終点 y
 * @param q1x - 第 2 線分の始点 x
 * @param q1y - 第 2 線分の始点 y
 * @param q2x - 第 2 線分の終点 x
 * @param q2y - 第 2 線分の終点 y
 * @param inclusive - true なら端点での接触も交差とみなす
 * @returns 線分が交差すれば true
 */
export const doSegmentsIntersectByCoords = (
	p1x: number,
	p1y: number,
	p2x: number,
	p2y: number,
	q1x: number,
	q1y: number,
	q2x: number,
	q2y: number,
	inclusive: boolean,
): boolean => {
	const rx = p2x - p1x;
	const ry = p2y - p1y;
	const sx = q2x - q1x;
	const sy = q2y - q1y;
	const denominator = rx * sy - ry * sx;

	if (Math.abs(denominator) < EPSILON) {
		return false;
	} // Parallel or colinear → always non-intersecting

	const qpx = q1x - p1x;
	const qpy = q1y - p1y;
	const t = (qpx * sy - qpy * sx) / denominator;
	const u = (qpx * ry - qpy * rx) / denominator;

	if (inclusive) {
		return t >= 0 && t <= 1 && u >= 0 && u <= 1;
	}

	return t > 0 && t < 1 && u > 0 && u < 1;
};
