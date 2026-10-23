import type { Point } from "@jiscribe/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";

export type Mods = {
	shift: boolean;
	alt: boolean;
	ctrl: boolean;
	meta: boolean;
};

/**
 * Moves one object by a delta, its descendants left to the caller.
 *
 * The result must draw exactly as `state` does, shifted by `delta`: while a move
 * drag is under way the canvas draws a moved object from its drag-start state
 * inside a translated group rather than from the state this returns (see
 * MovePreview), until the drop draws the returned state itself.
 *
 * @param state - The object to move, as it was before this move; not mutated
 * @param delta - World units, added as is: rounding it, or anything derived from
 *   it, would part the drawn drag from the dropped result
 * @returns A new state, or `state` itself for a type whose geometry is not its
 *   own to move (the connector, which follows its endpoints)
 */
export type MoveByDeltaFunction<TState extends ObjectState = ObjectState> = (
	state: TState,
	delta: Point,
) => TState;

export type TransformByGroupFunction<TState extends ObjectState = ObjectState> =
	(
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
