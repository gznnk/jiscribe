import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { FC } from "react";

import { ControlStrategy } from "./ControlStrategy";
import type { CanvasEvent } from "./GestureHandlerTypes";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import type {
	SelectionControlContext,
	SelectionControlDefinition,
	SelectionControlEvent,
	SelectionControlProps,
} from "../../ui/controls/SelectionControlTypes";
import { commitEditIfChanged } from "../../utils/commitEdit";
import { createCowObjects } from "../../utils/cowObjects";
import { reconcileGroupBounds } from "../../utils/reconcileGroupBounds";

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
		if (event.type !== "dragEnd") {
			return this.applyDrag(state, event);
		}
		// dragEnd always releases edge scrolling, even when the drag was a no-op,
		// and commits only when the definition returned an object for it.
		const closingState = { ...state, edgeScrollEnabled: false };
		const draggedState = this.applyDrag(closingState, event);
		return commitEditIfChanged(closingState, draggedState);
	}

	/**
	 * Builds the definition's context from the start snapshot and current frame,
	 * then writes its result back via COW, with the ancestor group frames settled
	 * around whatever the object's new box turned out to be. Returns the state
	 * unchanged when a guard fails or the definition reports no change.
	 *
	 * The settling is core's because a definition cannot do it: it is handed its
	 * own object and nothing else, so it can neither see the group it sits in nor
	 * reach the pass that would recompute it (see reconcileGroupBounds).
	 */
	private applyDrag(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		const objectId = event.targetId;
		if (!objectId) {
			return state;
		}
		const snapshot = state.activeDrag?.startSnapshot;
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
		return reconcileGroupBounds({ ...state, objects: updatedObjects }, state);
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
