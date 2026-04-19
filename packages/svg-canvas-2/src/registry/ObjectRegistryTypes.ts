import type { Point } from "@workspace/geometry/src/types/Point";

import type { ObjectMenuConfig } from "../controllers/ui/menu/ObjectMenu/types/ObjectMenuConfig";
import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";
import type { ObjectFeatures } from "../schemas/objects/types/ObjectFeatures";
import type { ObjectState } from "../states/objects/base/ObjectState";

/**
 * Function type that converts ObjectDoc to ObjectState.
 */
export type DocToStateMapper<
	TDoc extends ObjectDoc = ObjectDoc,
	TState extends ObjectState = ObjectState,
> = (doc: TDoc) => TState;

/**
 * Function type that converts ObjectState to ObjectDoc.
 */
export type StateToDocMapper<
	TState extends ObjectState = ObjectState,
	TDoc extends ObjectDoc = ObjectDoc,
> = (state: TState) => TDoc;

/**
 * Bidirectional mapper for converting between ObjectDoc and ObjectState.
 */
export type ObjectMapperType<
	TDoc extends ObjectDoc = ObjectDoc,
	TState extends ObjectState = ObjectState,
> = {
	toState: DocToStateMapper<TDoc, TState>;
	toDoc: StateToDocMapper<TState, TDoc>;
};

/**
 * Modifier keys state from pointer events.
 */
export type Mods = {
	shift: boolean;
	alt: boolean;
	ctrl: boolean;
	meta: boolean;
};

/**
 * Function that moves an object by a delta.
 * Returns a new object state with updated position.
 */
export type MoveByDeltaFunction<TState extends ObjectState = ObjectState> = (
	state: TState,
	delta: Point,
) => TState;

/**
 * Function that transforms an object when its parent group is transformed.
 * Returns a new object state with updated position, size, and rotation.
 */
export type TransformByGroupFunction<TState extends ObjectState = ObjectState> =
	(
		state: TState,
		groupStartState: ObjectState,
		groupEndState: ObjectState,
	) => TState;

/**
 * Function that rotates an object when its parent group is rotated.
 * Returns a new object state with updated position and rotation.
 */
export type RotateByGroupFunction<TState extends ObjectState = ObjectState> = (
	state: TState,
	rotationRootGroup: ObjectState,
	endGroupRotation: number,
) => TState;

/**
 * Complete definition for an object type in the registry.
 * Includes both data mapping logic and UI component.
 */
export type ObjectDefinition<
	TDoc extends ObjectDoc = ObjectDoc,
	TState extends ObjectState = ObjectState,
> = {
	features: ObjectFeatures;
	menuConfig: ObjectMenuConfig;
	mapper: ObjectMapperType<TDoc, TState>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: React.FC<any>;
	/**
	 * Moves the object by a delta.
	 * For objects with geometry: "none" (e.g., groups), this should return the state unchanged.
	 */
	moveByDelta: MoveByDeltaFunction<TState>;
	/**
	 * Transforms the object when its parent group is transformed.
	 * Applies group's translation, rotation, and scale to the object.
	 */
	transformByGroup: TransformByGroupFunction<TState>;
	/**
	 * Rotates the object when its parent group is rotated.
	 * Applies group's rotation to the object (performance-optimized version of transformByGroup for rotation-only).
	 */
	rotateByGroup: RotateByGroupFunction<TState>;
};
