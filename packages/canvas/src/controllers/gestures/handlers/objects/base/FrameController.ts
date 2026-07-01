import { roundToDecimal, type TransformedFrame } from "@workspace/geometry";

import { rotateFrameByGroup, transformFrameByGroup } from "./FrameTransform";
import { PRECISION } from "../../../../../constants/precision";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import type { ObjectBehaviorEntry } from "../../../registry/ObjectBehaviorTypes";

/**
 * Frame 系オブジェクト（rect / ellipse / diamond / svg / sticky など、
 * geometry: "rect" + transform を持つ図形）共通の振る舞いを生成する。
 *
 * これらの図形は移動・グループ変形・グループ回転がすべて同一で、
 * cx/cy を delta だけ動かし、変形・回転は `FrameTransform` に委譲する。
 * 図形ごとに違うのは表示だけなので、Controller はこの 1 つに集約する。
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
