import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { FC } from "react";

import { ControlStrategy } from "./ControlStrategy";
import type { CanvasEvent, EventType } from "./GestureHandlerTypes";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import type {
	SelectionControlContext,
	SelectionControlDefinition,
	SelectionControlEvent,
	SelectionControlEventType,
	SelectionControlProps,
} from "../../ui/controls/SelectionControlTypes";
import { createCowObjects } from "../../utils/cowObjects";
import { reconcileGroupBounds } from "../../utils/reconcileGroupBounds";

/**
 * data-part namespace for selection controls. Keeps them out of the built-in
 * controls' flat namespace (resize: / rotation / vertex: …).
 */
const SELECTION_CONTROL_NAMESPACE = "selection";

/**
 * Today's set, and what a definition naming none still gets. It lives with the
 * adapter rather than with the definition type because it is the adapter that
 * applies it, and controllers/gestures may not read a value out of
 * controllers/ui (the layer fence in eslint.config.js).
 */
export const DEFAULT_SELECTION_CONTROL_EVENTS = ["drag", "dragEnd"] as const;

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

/** Whether the event kind is one the definition asked for. */
const isOfferedEventType = (
	definition: SelectionControlDefinition,
	type: EventType,
): type is SelectionControlEventType => {
	const offered: readonly string[] =
		definition.events ?? DEFAULT_SELECTION_CONTROL_EVENTS;
	return offered.includes(type);
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
		if (!isOfferedEventType(this.definition, event.type)) {
			return state;
		}
		const updated = this.applyEvent(state, event, event.type);
		// dragEnd always releases edge scrolling, even when the drag was a no-op.
		return event.type === "dragEnd"
			? { ...updated, edgeScrollEnabled: false }
			: updated;
	}

	/**
	 * Builds the definition's context from the start snapshot and current frame,
	 * then writes its result back: the object via COW, the part selection with
	 * this object's id filled in, and the ancestor group frames settled around
	 * whatever the object's new box turned out to be. Returns the state unchanged
	 * when a guard fails or the definition reports no change.
	 *
	 * The settling is core's because a definition cannot do it: it is handed its
	 * own object and nothing else, so it can neither see the group it sits in nor
	 * reach the pass that would recompute it (see reconcileGroupBounds).
	 */
	private applyEvent(
		state: CanvasControllerState,
		event: CanvasEvent,
		type: SelectionControlEventType,
	): CanvasControllerState {
		const objectId = event.targetId;
		if (!objectId) {
			return state;
		}
		const object = state.objects[objectId];
		if (!object || object.type !== this.objectType) {
			return state;
		}
		const startObject = this.resolveStartObject(state, objectId, type);
		if (!startObject) {
			return state;
		}

		const context: SelectionControlContext = { object, startObject };
		const subPart = this.parseSubPart(event.targetPart);
		const controlEvent: SelectionControlEvent =
			type === "drag" || type === "dragEnd"
				? {
						type,
						start: event.start,
						last: event.last,
						delta: event.delta,
						mods: event.mods,
						subPart,
					}
				: { type, last: event.last, mods: event.mods, subPart };
		const result = this.definition.handle(context, controlEvent);
		if (!result) {
			return state;
		}

		let nextState = state;
		if (result.object) {
			// COW view over the previous frame's map (rebased internally, #213)
			const updatedObjects = createCowObjects(state.objects);
			updatedObjects[objectId] = result.object as ObjectState;
			nextState = reconcileGroupBounds(
				{ ...nextState, objects: updatedObjects },
				state,
			);
		}
		if (result.selection !== undefined) {
			// The control only draws on a sole selection of its own object, so that
			// object is already the part's owner (CanvasSelection.objectIds[0]).
			nextState = {
				...nextState,
				selection: { ...nextState.selection, part: result.selection },
			};
		}
		return nextState;
	}

	/**
	 * The object the definition rebuilds its result from. A drag reads the
	 * gesture-start snapshot, so every frame is derived from where the object
	 * stood when the pointer went down; an event that opens and closes in one
	 * frame has moved nothing, so the current frame is its own start. Null when
	 * the drag has no snapshot to build on, or it holds something else by then.
	 */
	private resolveStartObject(
		state: CanvasControllerState,
		objectId: string,
		type: SelectionControlEventType,
	): ObjectState | null {
		if (type !== "drag" && type !== "dragEnd") {
			return state.objects[objectId] ?? null;
		}
		const startObject = state.activeDrag?.startSnapshot?.objects[objectId];
		return startObject && startObject.type === this.objectType
			? startObject
			: null;
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
