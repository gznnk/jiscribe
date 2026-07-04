import type {
	BoxFeatures,
	OrthogonalDirection,
	Point,
} from "@workspace/geometry";

/**
 * An endpoint for the orthogonal router.
 * - `point`: the resolved endpoint coordinate (on a shape's edge or a free point)
 * - `direction`: the direction in which the line exits **outward** from the shape at this endpoint
 * - `box`: the axis-aligned bounding box of the connected shape (null for a free endpoint)
 */
export type OrthogonalConnectorEndpoint = {
	point: Point;
	direction: OrthogonalDirection;
	box: BoxFeatures | null;
};

/** Options for the orthogonal connector router. */
export type RouteOrthogonalConnectorOptions = {
	/** Distance by which the line is pushed out from a shape's face (stub length, px). */
	margin?: number;
	/**
	 * Topology signature (`calcPathSignature`) of the route drawn on the previous frame.
	 * Candidates matching it get a hysteresis bonus so the route does not flip between
	 * cost-tied shapes while an owner shape is dragged. Omit/null for a memoryless pick.
	 */
	previousPathSignature?: string | null;
};
