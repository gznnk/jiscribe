import type { FC } from "react";

import { ControlStrategy } from "./ControlStrategy";
import type { CanvasEvent } from "./GestureHandlerTypes";
import type { ObjectType } from "../../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import type {
	SelectionControlContext,
	SelectionControlDefinition,
	SelectionControlEvent,
	SelectionControlProps,
} from "../../ui/controls/SelectionControlTypes";
import { createCowObjects } from "../../utils/cowObjects";

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
 * ControlEventHandler can route to it. Owns the data-part format end to end
 * (`part` is what the control's Component must render, and supports() matches it
 * exact or prefixed) and the whole state contract the definition is shielded
 * from: the dragStart UI reset, snapshot guards, and the COW write-back.
 */
class SelectionControlStrategy extends ControlStrategy {
	readonly part: string;

	constructor(
		private readonly objectType: ObjectType,
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
	): CanvasControllerState {
		if (event.type === "dragStart") {
			return {
				...state,
				edgeScrollEnabled: true,
				objectMenuOpenId: null,
				stencilLibraryOpenCategory: null,
			};
		}
		if (event.type !== "drag" && event.type !== "dragEnd") {
			return state;
		}
		const updated = this.applyDrag(state, event);
		// dragEnd always releases edge scrolling, even when the drag was a no-op.
		return event.type === "dragEnd"
			? { ...updated, edgeScrollEnabled: false }
			: updated;
	}

	/**
	 * Builds the definition's context from the start snapshot and current frame,
	 * then writes its result back via COW. Returns the state unchanged when a
	 * guard fails or the definition reports no change.
	 */
	private applyDrag(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		const objectId = event.targetId;
		if (!objectId) {
			return state;
		}
		const snapshot = state.eventStartSnapshot;
		if (!snapshot) {
			return state;
		}
		const startObject = snapshot.objects[objectId];
		if (!startObject || startObject.type !== this.objectType) {
			return state;
		}
		const object = state.objects[objectId];
		if (!object) {
			return state;
		}

		const context: SelectionControlContext = { object, startObject };
		const controlEvent: SelectionControlEvent = {
			type: event.type as "drag" | "dragEnd",
			start: event.start,
			last: event.last,
			delta: event.delta,
			mods: event.mods,
			subPart: this.parseSubPart(event.targetPart),
		};
		const updatedObject = this.definition.handle(context, controlEvent);
		if (!updatedObject) {
			return state;
		}

		// COW view over the previous frame's map (rebased internally, #213)
		const updatedObjects = createCowObjects(state.objects);
		updatedObjects[objectId] = updatedObject as ObjectState;
		return { ...state, objects: updatedObjects };
	}

	/** The data-part segment after `${this.part}:`, or undefined when absent. */
	private parseSubPart(targetPart: string | undefined): string | undefined {
		const prefix = `${this.part}:`;
		return targetPart?.startsWith(prefix)
			? targetPart.slice(prefix.length)
			: undefined;
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
