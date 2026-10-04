import type { Point } from "@jiscribe/geometry";
import type { FC } from "react";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { Mods } from "../../gestures/recognizer/GestureRecognizerTypes";
import type { ObjectPartSelection } from "../../selection/ObjectPartSelection";

/**
 * The gesture kinds a selection control may ask for. `dragStart` is absent on
 * purpose: the adapter spends it on its own UI reset, so a definition could only
 * observe it, never decide anything with it.
 */
export type SelectionControlEventType =
	"click" | "doubleClick" | "drag" | "dragEnd";

/** Props passed to a selection control's handle renderer. */
export type SelectionControlProps<TState extends ObjectState = ObjectState> = {
	/** The single selected object the control operates on. */
	object: TState;
	/** Zoom level for keeping handle sizes visually constant. */
	zoom: number;
	/**
	 * The data-part value to render on the handles (`selection:<objectType>:<name>`),
	 * alongside data-kind="control" and data-id={object.id}.
	 */
	part: string;
	/**
	 * The sub-object selection standing on **this** object, already checked
	 * against the type's `parts` definition, or null when nothing of it is
	 * selected. Every control of the type sees the same value, `kind` included,
	 * so a control draws itself selected only for the kind it owns.
	 */
	selectedParts: ObjectPartSelection | null;
};

/** The control's own object, as of the current frame and the gesture-start snapshot. */
export type SelectionControlContext<TState extends ObjectState = ObjectState> =
	{
		/** The control's object in the current frame. */
		object: TState;
		/**
		 * The control's object captured at gesture start. Equal to `object` for an
		 * event that opens and closes in one frame (a click), nothing having moved.
		 */
		startObject: TState;
	};

/** What every selection-control event carries, whichever kind it is. */
type SelectionControlEventBase = {
	/** Current pointer position, in SVG coordinates. */
	last: Point;
	mods: Mods;
	/** data-part sub-segment after `selection:<type>:<name>:`, or undefined. */
	subPart?: string;
};

/** A drag in progress or just released, in SVG coordinates. */
export type SelectionControlDragEvent = SelectionControlEventBase & {
	type: "drag" | "dragEnd";
	/** Pointer position at gesture start. */
	start: Point;
	/** Movement from `start` to `last`. */
	delta: Point;
};

/**
 * A press that stayed put. It reports no `start` / `delta` because there is no
 * travel to report: `last` is where the pointer was the whole time.
 */
export type SelectionControlClickEvent = SelectionControlEventBase & {
	type: "click" | "doubleClick";
};

/** An event handed to a selection control, in SVG coordinates. */
export type SelectionControlEvent =
	SelectionControlDragEvent | SelectionControlClickEvent;

/**
 * What one selection-control event may change. A control owns its object and the
 * sub-object selection standing on it, and nothing else.
 *
 * Deliberately not a state transformer (`state => state`): the reducer writes the
 * objects map copy-on-write, one key per frame
 * (controllers/utils/cowObjects.ts), and a plugin handed the whole state could
 * break that contract from outside core. Letting a control move a sibling object
 * means arguing against that, not widening a type.
 */
export type SelectionControlResult<TState extends ObjectState = ObjectState> = {
	/** Full replacement of the control's own object. Omitted = unchanged. */
	object?: TState;
	/**
	 * The sub-object selection to install on this object. `null` clears it;
	 * omitted leaves it alone. `objectId` is filled in by the adapter, so a
	 * handle cannot address another object.
	 */
	selection?: ObjectPartSelection | null;
};

/**
 * A type-specific selection control: pairs the handle renderer with the gesture
 * handler that interprets its events. Registered per object type via
 * `ObjectTypeDefinition.selectionControls`, rendered by `SelectionControlsLayer`
 * (single selection only), and routed by `ControlEventHandler` via the derived
 * data-part.
 */
export type SelectionControlDefinition<
	TState extends ObjectState = ObjectState,
> = {
	/**
	 * Unique within the object type. Becomes the trailing segment of the control's
	 * data-part (`selection:<objectType>:<name>`), so changing it shifts the DOM
	 * contract (e2e selectors and any code matching on the part).
	 */
	name: string;
	/**
	 * Which gesture kinds `handle` is called for; anything else reaching the
	 * control's data-part is dropped. Omitted = the drag pair every control
	 * started with (`DEFAULT_SELECTION_CONTROL_EVENTS`, which the routing
	 * adapter owns).
	 */
	events?: readonly SelectionControlEventType[];
	/** Renders the handles carrying the `part` prop as their data-part. */
	Component: FC<SelectionControlProps<TState>>;
	/**
	 * Maps the gesture-start object plus cursor to what the event changed, or null
	 * for no change. Called only for the kinds `events` names; the adapter owns
	 * dragStart, the snapshot guards, and the write-back.
	 */
	handle: (
		context: SelectionControlContext<TState>,
		event: SelectionControlEvent,
	) => SelectionControlResult<TState> | null;
};
