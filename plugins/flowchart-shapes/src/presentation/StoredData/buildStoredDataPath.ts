import { STORED_DATA_CAP_RATIO } from "../../schema/storedData/StoredDataDoc";

/**
 * Builds the stored-data path (a rectangle whose left/right edges are half
 * ellipses both bowing left) for a bounding box whose top-left corner is at
 * (x, y). The left arc's apex touches the bounding-box left edge, so the
 * straight top/bottom edges start one arc depth in. Shared by the object
 * renderer (centered origin) and the draw-drag preview.
 */
export const buildStoredDataPath = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => {
	const depth = width * STORED_DATA_CAP_RATIO;
	const radii = `${depth} ${height / 2} 0 0`;
	return (
		`M ${x + depth} ${y} H ${x + width} ` +
		`A ${radii} 0 ${x + width} ${y + height} H ${x + depth} ` +
		`A ${radii} 1 ${x + depth} ${y} Z`
	);
};
