import type { FC } from "react";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { CanvasEvent } from "../../gestures/registry/GestureHandlerTypes";
import type { ICanvasRegistries } from "../../setup/ICanvasRegistries";

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
	/** Renders the handles carrying the `part` prop as their data-part. */
	Component: FC<SelectionControlProps<TState>>;
	/** Handles the control's events. */
	handle: (
		state: CanvasControllerState,
		event: CanvasEvent,
		registries: ICanvasRegistries,
	) => CanvasControllerState;
};
