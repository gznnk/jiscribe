import type { FC } from "react";

import { ControlStrategy } from "./ControlStrategy";
import type { CanvasEvent } from "./GestureHandlerTypes";
import type { ObjectType } from "../../../schemas/objects/types/ObjectType";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { ICanvasRegistries } from "../../setup/ICanvasRegistries";
import type {
	SelectionControlDefinition,
	SelectionControlProps,
} from "../../ui/controls/SelectionControlTypes";

/**
 * data-part namespace for selection controls. Keeps them out of the built-in
 * controls' flat namespace (resize: / rotation / vertex: …).
 */
const SELECTION_CONTROL_NAMESPACE = "selection";

/**
 * Extracts the object type from a selection-control data-part
 * (`selection:<objectType>:<name>[:<sub>…]`), or null for any other part.
 * Gatekeeper for ControlEventHandler's registry fallback.
 */
export const parseSelectionControlObjectType = (
	targetPart: string,
): string | null => {
	const [namespace, objectType] = targetPart.split(":");
	return namespace === SELECTION_CONTROL_NAMESPACE && objectType
		? objectType
		: null;
};

/**
 * Internal adapter wrapping a SelectionControlDefinition as a ControlStrategy so
 * ControlEventHandler can route to it. Owns the data-part format end to end:
 * `part` is what the control's Component must render, and supports() matches it
 * (exact, or prefixed for controls with sub-segments such as indexed handles).
 */
class SelectionControlStrategy extends ControlStrategy {
	readonly part: string;

	constructor(
		objectType: ObjectType,
		private readonly definition: SelectionControlDefinition,
	) {
		super();
		this.part = `${SELECTION_CONTROL_NAMESPACE}:${objectType}:${definition.name}`;
	}

	supports(event: CanvasEvent): boolean {
		if (event.targetKind !== "control" || !event.targetPart) {
			return false;
		}
		return (
			event.targetPart === this.part ||
			event.targetPart.startsWith(`${this.part}:`)
		);
	}

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
		registries: ICanvasRegistries,
	): CanvasControllerState {
		return this.definition.handle(state, event, registries);
	}
}

/**
 * A selection control after registration: the definition's Component plus its
 * derived data-part and the routing strategy. Consumed by SelectionControlsLayer
 * (part / Component) and ControlEventHandler (strategy).
 */
export type RegisteredSelectionControl = {
	part: string;
	Component: FC<SelectionControlProps>;
	strategy: ControlStrategy;
};

/** Derives the data-part and routing strategy for one control of the given type. */
export const createRegisteredSelectionControl = (
	objectType: ObjectType,
	definition: SelectionControlDefinition,
): RegisteredSelectionControl => {
	const strategy = new SelectionControlStrategy(objectType, definition);
	return { part: strategy.part, Component: definition.Component, strategy };
};
