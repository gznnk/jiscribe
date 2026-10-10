import type { Point } from "@jiscribe/geometry";
import type { FC } from "react";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { Mods } from "../../gestures/recognizer/GestureRecognizerTypes";

/** Props passed to a selection control's handle renderer. */
export type SelectionControlProps<TState extends ObjectState = ObjectState> = {
	/** The single selected object the control operates on. */
	object: TState;
	/** Zoom level for keeping handle sizes visually constant. */
	zoom: number;
	/**
	 * The data-action value to render on the handles (`selection:<objectType>:<name>`),
	 * alongside data-kind="control" and data-id={object.id}. A handle that stands
	 * for one of several grips appends `:<sub>` to it, read back as
	 * `SelectionControlEvent.subAction`.
	 */
	action: string;
};

/** The control's own object, as of the current frame and the gesture-start snapshot. */
export type SelectionControlContext<TState extends ObjectState = ObjectState> =
	{
		/** The control's object in the current frame. */
		object: TState;
		/** The control's object captured at gesture start. */
		startObject: TState;
	};

/** A drag/dragEnd event handed to a selection control, in SVG coordinates. */
export type SelectionControlEvent = {
	type: "drag" | "dragEnd";
	/** Pointer position at gesture start. */
	start: Point;
	/** Current pointer position. */
	last: Point;
	/** Movement from `start` to `last`. */
	delta: Point;
	mods: Mods;
	/** data-action sub-segment after `selection:<type>:<name>:`, or undefined. */
	subAction?: string;
};

/**
 * A type-specific selection control: pairs the handle renderer with the gesture
 * handler that interprets its events. Registered per object type via
 * `ObjectTypeDefinition.selectionControls`, rendered by `SelectionControlsLayer`
 * (single selection only), and routed by `ControlEventHandler` via the derived
 * data-action.
 */
export type SelectionControlDefinition<
	TState extends ObjectState = ObjectState,
> = {
	/**
	 * Unique within the object type. Becomes the trailing segment of the control's
	 * data-action (`selection:<objectType>:<name>`), so changing it shifts the DOM
	 * contract (e2e selectors and any code matching on the action).
	 */
	name: string;
	/** Renders the handles carrying the `action` prop as their data-action. */
	Component: FC<SelectionControlProps<TState>>;
	/**
	 * Maps the gesture-start object plus cursor to the updated object (full
	 * replacement), or null for no change. Called for drag/dragEnd only; the
	 * adapter owns dragStart, snapshot guards, and the write-back.
	 */
	handle: (
		context: SelectionControlContext<TState>,
		event: SelectionControlEvent,
	) => TState | null;
};
