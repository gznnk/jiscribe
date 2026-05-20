import type { Point } from "@workspace/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";

export type Mods = {
	shift: boolean;
	alt: boolean;
	ctrl: boolean;
	meta: boolean;
};

export type MoveByDeltaFunction<TState extends ObjectState = ObjectState> = (
	state: TState,
	delta: Point,
) => TState;

export type TransformByGroupFunction<
	TState extends ObjectState = ObjectState,
> = (
	state: TState,
	groupStartState: ObjectState,
	groupEndState: ObjectState,
) => TState;

export type RotateByGroupFunction<TState extends ObjectState = ObjectState> = (
	state: TState,
	rotationRootGroup: ObjectState,
	endGroupRotation: number,
) => TState;

export type ObjectBehaviorEntry<TState extends ObjectState = ObjectState> = {
	moveByDelta: MoveByDeltaFunction<TState>;
	transformByGroup: TransformByGroupFunction<TState>;
	rotateByGroup: RotateByGroupFunction<TState>;
};
