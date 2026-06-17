import type { Point } from "@workspace/geometry";

/**
 * ポリライン/線分の両端を、矢印の根元に合わせて内側へ短縮する。
 *
 * 先頭点は2番目の点へ向けて `startInset`、末尾点は末尾から2番目の点へ向けて
 * `endInset` だけ移動した新しい点列を返す。各 inset は絶対距離（既にスケール済み）で渡す。
 * 矢印が無い／短縮不要な端には 0 を渡す。
 *
 * これにより中空矢印が `fill="none"` でも線が中空部を貫通せず、また線が太いときに
 * 矢印の先端から線幅分はみ出すのも防げる。矢印自体は元の端点（先端）に描画するため、
 * 見た目上の端点位置は変わらない。
 *
 * 退行（線分の反転）を防ぐため、移動量は対象セグメント長を超えないようクランプする。
 * 2点のみで両端に inset がある場合は、合計がセグメント長を超えないよう比例配分する。
 */
export const insetPolylineEnds = (
	points: readonly Point[],
	startInset: number,
	endInset: number,
): Point[] => {
	const result = points.map((p) => ({ x: p.x, y: p.y }));

	let clampedStart = Math.max(startInset, 0);
	let clampedEnd = Math.max(endInset, 0);
	if (result.length < 2 || (clampedStart <= 0 && clampedEnd <= 0)) {
		return result;
	}

	const lastIdx = result.length - 1;

	// 2点のみで両端を短縮する場合は同一セグメントを分け合うため、合計をクランプする。
	if (result.length === 2) {
		const segmentLength = Math.hypot(
			result[1].x - result[0].x,
			result[1].y - result[0].y,
		);
		const totalInset = clampedStart + clampedEnd;
		if (totalInset > segmentLength && totalInset > 0) {
			clampedStart = (clampedStart / totalInset) * segmentLength;
			clampedEnd = (clampedEnd / totalInset) * segmentLength;
		}
	}

	if (clampedStart > 0) {
		movePointToward(result[0], result[1], clampedStart);
	}
	if (clampedEnd > 0) {
		movePointToward(result[lastIdx], result[lastIdx - 1], clampedEnd);
	}
	return result;
};

/**
 * `point` を `toward` 方向へ `distance` だけ移動する（in-place）。
 * 移動量はセグメント長を超えないようクランプする。
 */
const movePointToward = (
	point: { x: number; y: number },
	toward: Point,
	distance: number,
): void => {
	const deltaX = toward.x - point.x;
	const deltaY = toward.y - point.y;
	const length = Math.hypot(deltaX, deltaY);
	if (length === 0) {
		return;
	}
	const ratio = Math.min(distance, length) / length;
	point.x += deltaX * ratio;
	point.y += deltaY * ratio;
};
