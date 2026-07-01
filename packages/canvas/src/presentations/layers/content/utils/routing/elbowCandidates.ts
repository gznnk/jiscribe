import type {
	BoxFeatures,
	OrthogonalDirection,
	Point,
} from "@workspace/geometry";

const uniqueNumbers = (ns: number[]): number[] => [...new Set(ns)];

/** The box's outer clearance x channels (margin outside the left/right edges). Empty when free. */
const boxXChannels = (box: BoxFeatures | null, margin: number): number[] =>
	box ? [box.left - margin, box.right + margin] : [];

/** The box's outer clearance y channels (margin outside the top/bottom edges). Empty when free. */
const boxYChannels = (box: BoxFeatures | null, margin: number): number[] =>
	box ? [box.top - margin, box.bottom + margin] : [];

export type ElbowCandidate = {
	elbow: Point[];
	/** Whether it is a symmetric (S/Z-shaped) route bending at the "midpoint" for facing endpoints. */
	symmetric: boolean;
};

/**
 * Determines whether the endpoints' exit directions face each other head-on per axis (x: left/right, y: up/down).
 *
 * @param a - One endpoint's outward direction
 * @param b - The other endpoint's outward direction
 * @returns Whether they face on each axis (x: opposed left/right, y: opposed up/down)
 */
export const directionsFace = (
	a: OrthogonalDirection,
	b: OrthogonalDirection,
): { x: boolean; y: boolean } => ({
	x: (a === "right" && b === "left") || (a === "left" && b === "right"),
	y: (a === "down" && b === "up") || (a === "up" && b === "down"),
});

/**
 * Generates elbow candidates between stubs.
 *
 * Enumerates Z shapes passing through the candidate set of vertical channels x / horizontal channels y
 * (both stubs and the midpoint, plus **each box's perimeter clearance (edge ± margin)**). Including
 * the box perimeter channels brings wrap-around routes into the candidates, resolving the bends that
 * could not be expressed with fixed stubs alone and used to embed into shapes. L shapes and straight
 * lines emerge naturally, collapsed by `simplifyPath`.
 *
 * When `facingX` / `facingY` (endpoints face each other on the axis), the candidate that bends at that
 * axis's **midpoint** gets the `symmetric` flag, so the caller can prefer S/Z shapes.
 *
 * @param a - Coordinate of the source-side stub
 * @param b - Coordinate of the target-side stub
 * @param sourceBox - AABB to avoid for the source shape (null for a free endpoint)
 * @param targetBox - AABB to avoid for the target shape (null for a free endpoint)
 * @param margin - Push-out distance from the shape face (px). Used to compute the box perimeter channels
 * @param facingX - Whether the endpoints face on the x axis (left/right). If true, set symmetric on x=midpoint bend
 * @param facingY - Whether the endpoints face on the y axis (up/down). If true, set symmetric on y=midpoint bend
 * @returns An array of elbow candidates (each has the bend point sequence elbow and the symmetric flag)
 */
export const elbowCandidates = (
	a: Point,
	b: Point,
	sourceBox: BoxFeatures | null,
	targetBox: BoxFeatures | null,
	margin: number,
	facingX: boolean,
	facingY: boolean,
): ElbowCandidate[] => {
	const midX = Math.round((a.x + b.x) / 2);
	const midY = Math.round((a.y + b.y) / 2);
	// Collect the "channel" coordinates that are candidate bend positions.
	// - x/y of both stub ends (L shape = shortest bend)
	// - the midpoint midX/midY (symmetric S/Z-shaped bend)
	// - each box's perimeter (edge ± margin) (wrap-around bend; not expressible with straight stubs alone)
	// Duplicates are removed (the same channel only needs to be evaluated once).
	const xs = uniqueNumbers([
		a.x,
		b.x,
		midX,
		...boxXChannels(sourceBox, margin),
		...boxXChannels(targetBox, margin),
	]);
	const ys = uniqueNumbers([
		a.y,
		b.y,
		midY,
		...boxYChannels(sourceBox, margin),
		...boxYChannels(targetBox, margin),
	]);

	const candidates: ElbowCandidate[] = [];
	// A route through one vertical channel x (horizontal→vertical→horizontal). If x coincides with an
	// end or the midpoint, the extra points are collapsed by simplifyPath into an L shape / straight line.
	// In horizontally facing layouts, x=midX is an S shape bending in the center.
	for (const x of xs) {
		candidates.push({
			elbow: [a, { x, y: a.y }, { x, y: b.y }, b],
			symmetric: facingX && x === midX,
		});
	}
	// A route through one horizontal channel y (vertical→horizontal→vertical). In vertically facing
	// layouts, y=midY is an S shape bending in the center.
	for (const y of ys) {
		candidates.push({
			elbow: [a, { x: a.x, y }, { x: b.x, y }, b],
			symmetric: facingY && y === midY,
		});
	}
	return candidates;
};
