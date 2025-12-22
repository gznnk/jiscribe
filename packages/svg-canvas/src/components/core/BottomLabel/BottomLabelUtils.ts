import type { RectangleVertices } from "../../../types/core/RectangleVertices";

/**
 * Calculate the position of the bottom label.
 *
 * @param vertices - Rectangle vertices.
 * @returns The position of the bottom label.
 */
export const calcBottomLabelPosition = (vertices: RectangleVertices) => {
	let labelX = Number.NEGATIVE_INFINITY;
	let labelY = Number.NEGATIVE_INFINITY;
	const minYPosXList: number[] = [];
	for (const key of Object.keys(vertices)) {
		const vertex = vertices[key as keyof RectangleVertices];
		if (labelY < vertex.y) {
			labelY = vertex.y;
			labelX = vertex.x;
			// Clear the list if a new minimum Y position is found.
			minYPosXList.length = 0;
			minYPosXList.push(vertex.x);
		} else if (labelY === vertex.y) {
			minYPosXList.push(vertex.x);
		}
	}

	labelY += 23; // Add some margin to the label position.
	if (1 < minYPosXList.length) {
		// If there are multiple minimum Y positions, calculate the average X position.
		labelX = minYPosXList.reduce((acc, x) => acc + x, 0) / minYPosXList.length;
	}
	return { labelX, labelY };
};
