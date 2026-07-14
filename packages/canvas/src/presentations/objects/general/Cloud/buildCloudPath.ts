/**
 * Builds a bumpy cloud path filling the bounding box whose top-left corner is
 * at (x, y). Control points stay inside the unit box, so the path never
 * escapes the bounding box. Shared by the object renderer (centered origin)
 * and the draw-drag preview.
 */
export const buildCloudPath = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => {
	const p = (u: number, v: number) => `${x + u * width} ${y + v * height}`;
	return (
		`M ${p(0.25, 0.25)} ` +
		`C ${p(0.05, 0.25)} ${p(0, 0.5)} ${p(0.16, 0.55)} ` +
		`C ${p(0, 0.66)} ${p(0.18, 0.9)} ${p(0.31, 0.8)} ` +
		`C ${p(0.4, 1)} ${p(0.7, 1)} ${p(0.8, 0.8)} ` +
		`C ${p(1, 0.8)} ${p(1, 0.6)} ${p(0.875, 0.5)} ` +
		`C ${p(1, 0.3)} ${p(0.8, 0.1)} ${p(0.625, 0.2)} ` +
		`C ${p(0.5, 0.05)} ${p(0.3, 0.05)} ${p(0.25, 0.25)} Z`
	);
};
