/**
 * Predefined zoom levels following the step pattern:
 * 5-50%: 5% increments
 * 50-100%: 10% increments
 * 100%+: 25% increments
 */
const ZOOM_LEVELS = [
	// 5% to 50% (5% increments)
	0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5,
	// 50% to 100% (10% increments)
	0.6, 0.7, 0.8, 0.9, 1.0,
	// 100%+ (25% increments)
	1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0,
];

/**
 * Find the nearest zoom level from the predefined levels
 * @param currentZoom - Current zoom value
 * @returns Nearest zoom level
 */
export const findNearestZoomLevel = (currentZoom: number): number => {
	if (currentZoom <= ZOOM_LEVELS[0]) {
		return ZOOM_LEVELS[0];
	}
	if (currentZoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]) {
		return ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
	}

	let closestLevel = ZOOM_LEVELS[0];
	let minDifference = Math.abs(currentZoom - closestLevel);

	for (const level of ZOOM_LEVELS) {
		const difference = Math.abs(currentZoom - level);
		if (difference < minDifference) {
			minDifference = difference;
			closestLevel = level;
		}
	}

	return closestLevel;
};

/**
 * Get the next higher zoom level
 * @param currentZoom - Current zoom value
 * @returns Next higher zoom level
 */
export const getNextZoomLevel = (currentZoom: number): number => {
	// First snap to nearest level
	const nearestLevel = findNearestZoomLevel(currentZoom);

	// If current is already at or above nearest, find next level
	if (currentZoom >= nearestLevel) {
		const currentIndex = ZOOM_LEVELS.indexOf(nearestLevel);
		if (currentIndex < ZOOM_LEVELS.length - 1) {
			return ZOOM_LEVELS[currentIndex + 1];
		}
		return ZOOM_LEVELS[ZOOM_LEVELS.length - 1]; // Max level
	}

	// If current is below nearest, return nearest
	return nearestLevel;
};

/**
 * Get the next lower zoom level
 * @param currentZoom - Current zoom value
 * @returns Next lower zoom level
 */
export const getPreviousZoomLevel = (currentZoom: number): number => {
	// First snap to nearest level
	const nearestLevel = findNearestZoomLevel(currentZoom);

	// If current is already at or below nearest, find previous level
	if (currentZoom <= nearestLevel) {
		const currentIndex = ZOOM_LEVELS.indexOf(nearestLevel);
		if (currentIndex > 0) {
			return ZOOM_LEVELS[currentIndex - 1];
		}
		return ZOOM_LEVELS[0]; // Min level
	}

	// If current is above nearest, return nearest
	return nearestLevel;
};

/**
 * Reset zoom to 100%
 * @returns 100% zoom level (1.0)
 */
export const getResetZoomLevel = (): number => {
	return 1.0;
};
