import { roundToDecimal, type TransformedFrame } from "@workspace/geometry";

import { rotateFrameByGroup, transformFrameByGroup } from "./FrameTransform";
import { PRECISION } from "../../../constants/precision";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { ObjectBehaviorEntry } from "../../gestures/registry/ObjectBehaviorTypes";

/**
 * Creates the shared behavior for Frame-based objects (rect / ellipse / svg, and
 * most plugin shapes, i.e. shapes with geometry: "rect" + transform).
 *
 * These shapes share identical move, group-transform, and group-rotation behavior:
 * cx/cy are shifted by delta, and transform/rotation are delegated to `FrameTransform`.
 * Since only their rendering differs per shape, the controller is consolidated into this one.
 */
export const createFrameBehavior = <
	TState extends ObjectState & TransformedFrame,
>(): ObjectBehaviorEntry<TState> => ({
	moveByDelta: (state, delta) => ({
		...state,
		cx: roundToDecimal(state.cx + delta.x, PRECISION.COORDINATE),
		cy: roundToDecimal(state.cy + delta.y, PRECISION.COORDINATE),
	}),

	transformByGroup: (state, groupStart, groupEnd) =>
		transformFrameByGroup(
			state,
			groupStart as GroupState,
			groupEnd as GroupState,
		),

	rotateByGroup: (state, rotationRootGroup, endGroupRotation) =>
		rotateFrameByGroup(
			state,
			rotationRootGroup as GroupState,
			endGroupRotation,
		),
});
