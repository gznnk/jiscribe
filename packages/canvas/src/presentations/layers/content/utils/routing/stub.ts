import type {
	BoxFeatures,
	OrthogonalDirection,
	Point,
} from "@workspace/geometry";

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

/**
 * 退出方向に沿った相手端点までの前方距離（符号付き）。
 * 正なら相手は退出方向の前方に、負なら後方（裏側）にある。
 *
 * @param point - 自端点座標
 * @param direction - 自端点の外向き方向
 * @param other - 相手端点座標
 * @returns 退出方向への前方距離（前方が正）
 */
const forwardDistance = (
	point: Point,
	direction: OrthogonalDirection,
	other: Point,
): number => {
	switch (direction) {
		case "up":
			return point.y - other.y;
		case "down":
			return other.y - point.y;
		case "left":
			return point.x - other.x;
		case "right":
			return other.x - point.x;
	}
};

/**
 * 近接して向かい合う端点同士で、スタブの押し出しが相手側を追い越して
 * 無駄な回り込み（ぐるっと回る経路）を誘発するのを防ぐためのスタブ長クランプ。
 *
 * 相手端点が退出方向の**前方**にあるときだけ、スタブ長を「相手までの前方距離の半分」に
 * 制限する。両端が同様にクランプされると 2 本のスタブはちょうど中間で出会い、
 * 余分な折れ込みを作らずに済む（整列していれば直線、ずれていれば中間で 1 度折れる Z）。
 *
 * - 前方距離 ≥ 2×margin（＝既定 60px 以上離れている）では `margin/2` 以上が確保されるため
 *   フル margin のまま変化しない（しきい値で不連続にならず滑らかに切り替わる）。
 * - 相手が後方（裏側）にある配置（前方距離 ≤ 0）はクランプしない。一度まっすぐ出てから
 *   回り込む必要があるため、スタブを削ると逆走スパイクを招く（#77 参照）。
 *
 * @param point - 自端点座標
 * @param direction - 自端点の外向き方向
 * @param other - 相手端点座標
 * @param margin - 既定のスタブ長（px）
 * @returns クランプ後のスタブ長（px）
 */
export const clampStubMargin = (
	point: Point,
	direction: OrthogonalDirection,
	other: Point,
	margin: number,
): number => {
	const forward = forwardDistance(point, direction, other);
	if (forward <= 0) {
		return margin;
	}
	return Math.min(margin, forward / 2);
};
