import type { Point } from "@workspace/geometry/src/types/Point";

import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";
import type { ObjectFeatures } from "../schemas/objects/types/ObjectFeatures";
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
 * Modifier keys state from pointer events.
 */
export type Mods = {
	shift: boolean;
	alt: boolean;
	ctrl: boolean;
	meta: boolean;
};

/**
 * Parameters passed to drag event handlers.
 */
export type DragEventHandlerParams<TState extends ObjectState = ObjectState> = {
	/** The movement delta from the drag start position */
	delta: Point;
	/** The object state at the start of the event (from eventStartState) */
	objectState: TState;
	/** The current canvas state */
	canvasState: CanvasState;
	/** Modifier keys pressed during the event */
	mods: Mods;
	/** Timestamp of the event */
	time: number;
};

/**
 * Event handler for drag events on objects.
 * Returns the entire CanvasState to allow full canvas updates.
 */
export type DragEventHandler<TState extends ObjectState = ObjectState> = (
	params: DragEventHandlerParams<TState>,
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
	features: ObjectFeatures;
	mapper: ObjectMapperType<TDoc, TState>;
	eventHandler: ObjectEventHandler;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: React.FC<any>;
};
