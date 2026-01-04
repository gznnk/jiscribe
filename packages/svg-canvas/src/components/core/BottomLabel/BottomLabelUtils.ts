import type { RectKeyPoints } from "@workspace/geometry";

/**
 * Calculate the position of the bottom label.
 *
 * @param keyPoints - Rectangle key points.
 * @returns The position of the bottom label.
 */
export const calcBottomLabelPosition = (keyPoints: RectKeyPoints) => {
	let labelX = Number.NEGATIVE_INFINITY;
	let labelY = Number.NEGATIVE_INFINITY;
	const minYPosXList: number[] = [];
	for (const key of Object.keys(keyPoints)) {
		const keyPoint = keyPoints[key as keyof RectKeyPoints];
		if (labelY < keyPoint.y) {
			labelY = keyPoint.y;
			labelX = keyPoint.x;
			// Clear the list if a new minimum Y position is found.
			minYPosXList.length = 0;
			minYPosXList.push(keyPoint.x);
		} else if (labelY === keyPoint.y) {
			minYPosXList.push(keyPoint.x);
		}
	}

	labelY += 23; // Add some margin to the label position.
	if (1 < minYPosXList.length) {
		// If there are multiple minimum Y positions, calculate the average X position.
		labelX = minYPosXList.reduce((acc, x) => acc + x, 0) / minYPosXList.length;
	}
	return { labelX, labelY };
};
