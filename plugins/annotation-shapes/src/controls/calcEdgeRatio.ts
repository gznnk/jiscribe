/**
 * Where a local coordinate falls along an edge of `extent` px centered on 0, as
 * a 0..1 ratio (unclamped); 0.5 for a zero extent.
 */
export const calcEdgeRatio = (
	localCoordinate: number,
	extent: number,
): number => (extent === 0 ? 0.5 : (localCoordinate + extent / 2) / extent);
