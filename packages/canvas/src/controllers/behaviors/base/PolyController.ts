import { rotatePolyByGroup, transformPolyByGroup } from "./PolyTransform";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { PolygonState } from "../../../states/objects/primitives/polygon/PolygonState";
import type { PolylineState } from "../../../states/objects/primitives/polyline/PolylineState";
import type { ObjectBehaviorEntry } from "../../gestures/registry/ObjectBehaviorTypes";

/**
 * Creates the shared behavior for vertex-based shapes (polygon / polyline).
 *
 * Every vertex in `points` is shifted by the move delta, and group transform and
 * rotation are delegated to `PolyTransform`.
 */
export const createPolyBehavior = <
	TState extends PolygonState | PolylineState,
>(): ObjectBehaviorEntry<TState> => ({
	moveByDelta: (state, delta) => ({
		...state,
		points: state.points.map((point) => ({
			x: point.x + delta.x,
			y: point.y + delta.y,
		})),
	}),

	transformByGroup: (state, groupStart, groupEnd) =>
		transformPolyByGroup(
			state,
			groupStart as GroupState,
			groupEnd as GroupState,
		),

	rotateByGroup: (state, rotationRootGroup, endGroupRotation) =>
		rotatePolyByGroup(state, rotationRootGroup as GroupState, endGroupRotation),
});
