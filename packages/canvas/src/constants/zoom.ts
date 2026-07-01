/**
 * Zoom configuration constants
 */
export const ZOOM = {
	/** Minimum zoom level (10%) */
	MIN: 0.1,
	/** Maximum zoom level (1000%) */
	MAX: 10,
	/** Zoom step factor when zooming in（ホイール用の連続ズーム） */
	IN_FACTOR: 1.1,
	/** Zoom step factor when zooming out（ホイール用の連続ズーム） */
	OUT_FACTOR: 0.9,
} as const;

/**
 * Zoom In / Zoom Out コマンド（キーボード・ツールバー）が吸着する固定段。
 * Miro のように常に同じ値（…/75/100/125/150/…）へスナップし、
 * ズームイン→ズームアウトで必ず元の段（100% など）へ戻れるようにする。
 *
 * 昇順で保持する。両端は {@link ZOOM.MIN} / {@link ZOOM.MAX} と一致させる。
 */
export const ZOOM_STOPS = [
	0.1, 0.125, 0.16, 0.25, 0.33, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8,
	10,
] as const;

/** 浮動小数の段一致を許容するための比較イプシロン。 */
const ZOOM_STEP_EPSILON = 1e-4;

/**
 * 現在のズーム値より一段上の固定段を返す。
 * 段の途中にいる場合は直近の上の段へ、最上段なら {@link ZOOM.MAX} に丸める。
 */
export function stepZoomIn(currentZoom: number): number {
	const nextStop = ZOOM_STOPS.find(
		(stop) => stop > currentZoom + ZOOM_STEP_EPSILON,
	);
	return nextStop ?? ZOOM.MAX;
}

/**
 * 現在のズーム値より一段下の固定段を返す。
 * 段の途中にいる場合は直近の下の段へ、最下段なら {@link ZOOM.MIN} に丸める。
 */
export function stepZoomOut(currentZoom: number): number {
	for (let i = ZOOM_STOPS.length - 1; i >= 0; i--) {
		if (ZOOM_STOPS[i] < currentZoom - ZOOM_STEP_EPSILON) {
			return ZOOM_STOPS[i];
		}
	}
	return ZOOM.MIN;
}
