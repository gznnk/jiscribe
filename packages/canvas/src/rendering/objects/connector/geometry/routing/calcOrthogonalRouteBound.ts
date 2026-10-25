import {
	calcFrameBoxFeatures,
	isTransformedFrame,
	type BoundingBox,
	type Point,
} from "@jiscribe/geometry";

import { DEFAULT_CONNECTOR_MARGIN } from "./routingConstants";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";

/**
 * Slack past the margin for the crossover channel, which elbowCandidates rounds
 * to a whole unit and so can land up to 0.5 outside the coordinates it lies
 * between.
 */
const CROSSOVER_ROUNDING_SLACK = 1;

/**
 * A box that contains every point of the route resolveOrthogonalRoute returns
 * for these inputs, found without routing.
 *
 * Every point of that route sits on a channel the router draws from: an
 * endpoint, a stub (pushed out from its owner's box by at most
 * DEFAULT_CONNECTOR_MARGIN, `stubPoint` / `clampStubMargin`), a box edge ± that
 * margin (`elbowCandidates`, and the self-loop ring in `selfLoop`), or the
 * rounded crossover between them. So the union of the endpoints and the boxes
 * the router avoids, grown by the margin, holds it. Changing the margin or the
 * channels means changing this too; `calcOrthogonalRouteBound.test.ts` sweeps
 * layouts against the real router to catch a drift.
 *
 * @param sourcePoint - The resolved source endpoint, world coordinates (resolveConnectorEnds)
 * @param targetPoint - The resolved target endpoint, world coordinates
 * @param sourceObj - The source owner; boxed as the router boxes it (a frame's
 *   rotated AABB), null/undefined or a non-frame for no box
 * @param targetObj - The target owner, boxed the same way
 * @returns A box at least DEFAULT_CONNECTOR_MARGIN wider on every side than the
 *   endpoints and owner boxes; not the route's box, only one containing it
 */
export const calcOrthogonalRouteBound = (
	sourcePoint: Point,
	targetPoint: Point,
	sourceObj: ObjectState | null | undefined,
	targetObj: ObjectState | null | undefined,
): BoundingBox => {
	let left = Math.min(sourcePoint.x, targetPoint.x);
	let top = Math.min(sourcePoint.y, targetPoint.y);
	let right = Math.max(sourcePoint.x, targetPoint.x);
	let bottom = Math.max(sourcePoint.y, targetPoint.y);
	for (const owner of [sourceObj, targetObj]) {
		if (owner && isTransformedFrame(owner)) {
			const box = calcFrameBoxFeatures(owner);
			left = Math.min(left, box.left);
			top = Math.min(top, box.top);
			right = Math.max(right, box.right);
			bottom = Math.max(bottom, box.bottom);
		}
	}
	const reach = DEFAULT_CONNECTOR_MARGIN + CROSSOVER_ROUNDING_SLACK;
	return {
		left: left - reach,
		top: top - reach,
		right: right + reach,
		bottom: bottom + reach,
	};
};
