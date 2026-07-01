import { calcEuclideanDistance, type Point } from "@workspace/geometry";

/**
 * 折れ線（解決済みコネクター経路）上のラベルアンカー座標を求める。
 *
 * `position` は経路長に対する比率（0 = source 端、1 = target 端、既定 0.5 = 中点）。
 * `offset` は経路の進行方向に対して左向き（(-dy, dx)）を正とする符号付きの
 * 垂直距離（ワールド単位、既定 0）。比率で持つことで、直交ルーティングの
 * 再計算で経路が変わってもラベルが線に追従する。
 *
 * @param points source → ...waypoints → target 順の解決済み座標列（最低 2 点）
 */
export const calcConnectorLabelAnchor = (
	points: readonly Point[],
	position = 0.5,
	offset = 0,
): Point | null => {
	if (points.length < 2) {
		return points.length === 1 ? { ...points[0] } : null;
	}

	// 各セグメント長と総長を求める。
	const segmentLengths: number[] = [];
	let totalLength = 0;
	for (let i = 0; i < points.length - 1; i++) {
		const length = calcEuclideanDistance(
			points[i].x,
			points[i].y,
			points[i + 1].x,
			points[i + 1].y,
		);
		segmentLengths.push(length);
		totalLength += length;
	}

	// 退化（総長 0）の経路は始点を返す。
	if (totalLength === 0) {
		return { ...points[0] };
	}

	const clampedPosition = Math.min(1, Math.max(0, position));
	let remaining = clampedPosition * totalLength;

	// remaining を消費して該当セグメントと内分位置を特定する。
	let segmentIndex = 0;
	while (
		segmentIndex < segmentLengths.length - 1 &&
		remaining > segmentLengths[segmentIndex]
	) {
		remaining -= segmentLengths[segmentIndex];
		segmentIndex += 1;
	}

	const start = points[segmentIndex];
	const end = points[segmentIndex + 1];
	const segmentLength = segmentLengths[segmentIndex];
	const ratio = segmentLength === 0 ? 0 : remaining / segmentLength;

	const x = start.x + (end.x - start.x) * ratio;
	const y = start.y + (end.y - start.y) * ratio;

	if (offset === 0 || segmentLength === 0) {
		return { x, y };
	}

	// 進行方向に対する左向き法線 (-dy, dx) を単位化してオフセットを適用する。
	const dirX = (end.x - start.x) / segmentLength;
	const dirY = (end.y - start.y) / segmentLength;
	return { x: x - dirY * offset, y: y + dirX * offset };
};
