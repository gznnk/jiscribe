import type {
	BoxFeatures,
	OrthogonalDirection,
	Point,
} from "@workspace/geometry";

/** 図形の面から線を押し出す既定のスタブ長（px）。 */
export const DEFAULT_MARGIN = 20;

/**
 * 端点のスタブ点を返す。退出方向の軸では**バウンディングボックスの辺 + margin**まで
 * 押し出し（回転した図形でも AABB の外へ確実に出す）、直交軸は端点座標を保つ。
 *
 * 非回転の図形では face 中心が AABB の辺上にあるため、辺 + margin は
 * 「face 中心 + margin」と一致し、従来挙動と変わらない。回転した図形では face 中心が
 * AABB の内側に入るので、固定 margin だけでは AABB を出られずめり込んでいたのを解消する。
 *
 * 前提: `point` は退出方向の辺の上にあること（connectPoint＝辺の中央なら厳密に成立）。
 * center アンカー等で `point` が辺上に無い場合、スタブ脚（point → stub）が直交軸方向に
 * AABB をかすめうる（v1 の近似。実害は connectPoint 主体なら小さい）。
 *
 * @param point - 端点座標（退出方向の辺上にある前提）
 * @param direction - 線が図形から外へ出る直交方向
 * @param box - 図形の軸並行バウンディングボックス
 * @param margin - 辺からの押し出し距離（px）
 * @returns 退出方向へ押し出したスタブ点（直交軸の座標は据え置き）
 */
export const stubPoint = (
	point: Point,
	direction: OrthogonalDirection,
	box: BoxFeatures,
	margin: number,
): Point => {
	switch (direction) {
		case "up":
			return { x: point.x, y: box.top - margin };
		case "down":
			return { x: point.x, y: box.bottom + margin };
		case "left":
			return { x: box.left - margin, y: point.y };
		case "right":
			return { x: box.right + margin, y: point.y };
	}
};
