/**
 * Whether a segment of a straight connector can be dragged anywhere on the canvas.
 *
 * The drawn path is `[source, ...points, target]`, so a segment's two ends are either the
 * connector's endpoints (path index 0 and the last) or its own vertices (everything between).
 * A vertex is a plain coordinate and follows the cursor; an endpoint only does so when it is free,
 * since an owned one is pinned to its shape's face. The segment moves as a whole, so it needs both
 * of its ends to be movable — one pinned end would turn the drag into a rotation, which is what the
 * endpoint handle already does.
 *
 * A connector must own at least one endpoint (see validateConnectorDoc), so a straight connector
 * with no vertices never qualifies: its single segment always has a pinned end. What this admits is
 * the vertex-to-vertex segments, and the one next to a free endpoint.
 *
 * @param segmentIndex - The segment, spanning `path[segmentIndex]` → `path[segmentIndex + 1]`
 * @param pathLength - Number of points on the drawn path, endpoints included (at least 2)
 * @param sourceIsFree - Whether the source endpoint has no owner shape
 * @param targetIsFree - Whether the target endpoint has no owner shape
 * @returns False for an out-of-range index, so callers can pass an unvalidated one
 */
export const isConnectorSegmentFreelyMovable = (
	segmentIndex: number,
	pathLength: number,
	sourceIsFree: boolean,
	targetIsFree: boolean,
): boolean => {
	if (segmentIndex < 0 || segmentIndex > pathLength - 2) {
		return false;
	}
	const startIsMovable = segmentIndex > 0 || sourceIsFree;
	const endIsMovable = segmentIndex + 1 < pathLength - 1 || targetIsFree;
	return startIsMovable && endIsMovable;
};
