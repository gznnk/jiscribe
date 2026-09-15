import type {
	BoxFeatures,
	OrthogonalDirection,
	Point,
} from "@jiscribe/geometry";

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
};
