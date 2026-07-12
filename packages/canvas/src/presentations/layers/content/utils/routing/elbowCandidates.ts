import type { BoxFeatures, Point } from "@workspace/geometry";

const uniqueNumbers = (ns: number[]): number[] => [...new Set(ns)];

/** The box's outer clearance x channels (margin outside the left/right edges). Empty when free. */
const boxXChannels = (box: BoxFeatures | null, margin: number): number[] =>
	box ? [box.left - margin, box.right + margin] : [];

/** The box's outer clearance y channels (margin outside the top/bottom edges). Empty when free. */
const boxYChannels = (box: BoxFeatures | null, margin: number): number[] =>
	box ? [box.top - margin, box.bottom + margin] : [];

/**
 * The center of the gap between the two boxes on the x axis (midway between their facing edges),
 * or null when the boxes overlap on x (no gap → no meaningful center) or a box is missing.
 */
const gapCenterX = (
	sourceBox: BoxFeatures | null,
	targetBox: BoxFeatures | null,
): number | null => {
	if (!sourceBox || !targetBox) {
		return null;
	}
	if (sourceBox.right <= targetBox.left) {
		return (sourceBox.right + targetBox.left) / 2;
	}
	if (targetBox.right <= sourceBox.left) {
		return (targetBox.right + sourceBox.left) / 2;
	}
	return null;
};

/**
 * The center of the gap between the two boxes on the y axis (midway between their facing edges),
 * or null when the boxes overlap on y (no gap → no meaningful center) or a box is missing.
 */
const gapCenterY = (
	sourceBox: BoxFeatures | null,
	targetBox: BoxFeatures | null,
): number | null => {
	if (!sourceBox || !targetBox) {
		return null;
	}
	if (sourceBox.bottom <= targetBox.top) {
		return (sourceBox.bottom + targetBox.top) / 2;
	}
	if (targetBox.bottom <= sourceBox.top) {
		return (targetBox.bottom + sourceBox.top) / 2;
	}
	return null;
};

export type ElbowCandidate = {
	elbow: Point[];
	/**
	 * Whether it bends at the **center between the two shapes** on the crossover axis (the ideal
	 * S/Z crossover). The caller prefers this among equal-cost candidates so the jog sits at the
	 * midline between the shapes rather than hugging one shape's margin.
	 */
	symmetric: boolean;
};

/**
 * Generates elbow candidates between stubs.
 *
 * Enumerates Z shapes passing through the candidate set of vertical channels x / horizontal channels y
 * (both stubs, the ideal crossover, plus **each box's perimeter clearance (edge ± margin)**). Including
 * the box perimeter channels brings wrap-around routes into the candidates, resolving the bends that
 * could not be expressed with fixed stubs alone and used to embed into shapes. L shapes and straight
 * lines emerge naturally, collapsed by `simplifyPath`.
 *
 * The **ideal crossover** on each axis is the center of the gap between the two boxes (midway between
 * their facing edges). When the boxes overlap on that axis (or an endpoint is free), it falls back to
 * the midpoint of the two stubs. The candidate bending exactly there gets the `symmetric` flag, so the
 * caller can prefer an S/Z that jogs at the midline between the shapes over one hugging a shape's margin.
 * For facing (edge-to-edge) layouts the gap center equals the stub midpoint, so this matches the prior
 * behavior; the difference shows up for non-facing layouts (e.g. top→left), where the stub midpoint is
 * lopsided but the gap center is truly between the shapes.
 *
 * @param a - Coordinate of the source-side stub
 * @param b - Coordinate of the target-side stub
 * @param sourceBox - AABB to avoid for the source shape (null for a free endpoint)
 * @param targetBox - AABB to avoid for the target shape (null for a free endpoint)
 * @param margin - Push-out distance from the shape face (px). Used to compute the box perimeter channels
 * @returns An array of elbow candidates (each has the bend point sequence elbow and the symmetric flag)
 */
export const elbowCandidates = (
	a: Point,
	b: Point,
	sourceBox: BoxFeatures | null,
	targetBox: BoxFeatures | null,
	margin: number,
): ElbowCandidate[] => {
	// The ideal crossover position per axis: the center of the gap between the two shapes. Falls back
	// to the midpoint of the two stubs when the boxes overlap on that axis or an endpoint is free.
	const idealX = Math.round(
		gapCenterX(sourceBox, targetBox) ?? (a.x + b.x) / 2,
	);
	const idealY = Math.round(
		gapCenterY(sourceBox, targetBox) ?? (a.y + b.y) / 2,
	);
	// Collect the "channel" coordinates that are candidate bend positions.
	// - x/y of both stub ends (L shape = shortest bend)
	// - the ideal crossover idealX/idealY (symmetric S/Z-shaped bend centered between the shapes)
	// - each box's perimeter (edge ± margin) (wrap-around bend; not expressible with straight stubs alone)
	// Duplicates are removed (the same channel only needs to be evaluated once).
	// A candidate that grazes within a shape's margin is not filtered out here; the margin-intrusion
	// penalty in `calcRouteCost` demotes it so a fuller-clearance wrap wins when one exists.
	const xs = uniqueNumbers([
		a.x,
		b.x,
		idealX,
		...boxXChannels(sourceBox, margin),
		...boxXChannels(targetBox, margin),
	]);
	const ys = uniqueNumbers([
		a.y,
		b.y,
		idealY,
		...boxYChannels(sourceBox, margin),
		...boxYChannels(targetBox, margin),
	]);

	const candidates: ElbowCandidate[] = [];
	// A route through one vertical channel x (horizontal→vertical→horizontal). If x coincides with an
	// end or the ideal crossover, the extra points are collapsed by simplifyPath into an L shape / straight
	// line. x=idealX is the S shape bending at the center between the shapes.
	for (const x of xs) {
		candidates.push({
			elbow: [a, { x, y: a.y }, { x, y: b.y }, b],
			symmetric: x === idealX,
		});
	}
	// A route through one horizontal channel y (vertical→horizontal→vertical). y=idealY is the S shape
	// bending at the center between the shapes.
	for (const y of ys) {
		candidates.push({
			elbow: [a, { x: a.x, y }, { x: b.x, y }, b],
			symmetric: y === idealY,
		});
	}
	return candidates;
};
