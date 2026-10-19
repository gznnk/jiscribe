/**
 * Id of the connection point on a marker's tip. Stored in a saved doc as
 * `{ "kind": "connectPoint", "id": "tip" }`, so it is part of the file format:
 * point a connector at it to attach to the cusp of a `{` rather than to an edge
 * midpoint of the thin band around it.
 */
export const GROUP_MARKER_TIP_CONNECT_POINT_ID = "tip";

/**
 * The connect point ids every group marker offers beyond the edge midpoints,
 * whatever its fields: the tip alone, the one point calcGroupMarkerConnectPoints
 * places. Read through each marker's `extraConnectPointIds`.
 */
export const GROUP_MARKER_EXTRA_CONNECT_POINT_IDS: readonly string[] = [
	GROUP_MARKER_TIP_CONNECT_POINT_ID,
];
