import type { FC } from "react";

import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { SelectionControlHandler } from "../gestures/registry/SelectionControlHandler";

/** Props passed to a selection control's handle renderer. */
export type SelectionControlProps<TState extends ObjectState = ObjectState> = {
	/** The single selected object the control operates on. */
	object: TState;
	/** Zoom level for keeping handle sizes visually constant. */
	zoom: number;
	/**
	 * The data-part value to render on the handles (from `handler.part`,
	 * `selection:<objectType>:<partName>`), alongside data-kind="control" and
	 * data-id={object.id}.
	 */
	part: string;
};

/**
 * A type-specific selection control: pairs the handle renderer with the
 * SelectionControlHandler that interprets its gestures. Registered per object
 * type via `ObjectTypeDefinition.selectionControls`, rendered by
 * `SelectionControlsLayer` (single selection only), and routed by
 * `ControlEventHandler` via the handler's data-part.
 */
export type SelectionControlDefinition<
	TState extends ObjectState = ObjectState,
> = {
	/** Renders the handles carrying the `part` prop as their data-part. */
	Component: FC<SelectionControlProps<TState>>;
	/** Handles the control's events; also owns the data-part identity. */
	handler: SelectionControlHandler;
};
