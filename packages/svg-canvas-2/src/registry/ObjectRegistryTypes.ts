import type { Point } from "@workspace/geometry/src/types/Point";

import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";
import type { CanvasState } from "../states/canvas/CanvasState";
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
 * Event handler for drag events on objects.
 * Returns the entire CanvasState to allow full canvas updates.
 */
export type DragEventHandler<TState extends ObjectState = ObjectState> = (
	delta: Point,
	objectState: TState,
	canvasState: CanvasState,
) => CanvasState;

/**
 * Set of event handlers for an object type.
 */
export type ObjectEventHandler = {
	onDragStart?: DragEventHandler;
	onDrag?: DragEventHandler;
	onDragEnd?: DragEventHandler;
};

/**
 * Complete definition for an object type in the registry.
 * Includes both data mapping logic and UI component.
 */
export type ObjectDefinition<
	TDoc extends ObjectDoc = ObjectDoc,
	TState extends ObjectState = ObjectState,
> = {
	mapper: ObjectMapperType<TDoc, TState>;
	eventHandler: ObjectEventHandler;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: React.FC<any>;
};
