import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { FC } from "react";

import { ControlStrategy } from "./ControlStrategy";
import type { CanvasEvent, EventType } from "./GestureHandlerTypes";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { ObjectPartSelection } from "../../selection/CanvasSelection";
import type {
	SelectionControlContext,
	SelectionControlDefinition,
	SelectionControlEvent,
	SelectionControlEventType,
	SelectionControlLayer,
	SelectionControlProps,
} from "../../ui/controls/SelectionControlTypes";
import { claimDrag } from "../../utils/claimDrag";
import { commitEdit } from "../../utils/commitEdit";
import { createCowObjects } from "../../utils/cowObjects";
import { reconcileGroupBounds } from "../../utils/reconcileGroupBounds";

/**
 * data-action namespace for selection controls. Keeps them out of the built-in
 * controls' flat namespace (resize: / rotation / vertex: …).
 */
const SELECTION_CONTROL_NAMESPACE = "selection";

/**
 * The event kinds a selection control receives when its definition names none
 * (`SelectionControlDefinition.events`). Kept with the adapter that applies it,
 * since controllers/gestures may not import values from controllers/ui (the
 * layer fence in eslint.config.js).
 */
export const DEFAULT_SELECTION_CONTROL_EVENTS: readonly SelectionControlEventType[] =
	["drag", "dragEnd"];

/**
 * The layer a selection control is drawn in when its definition names none
 * (`SelectionControlDefinition.layer`): over the core handles, as every control
 * was before the field existed. Kept here for the same layer fence as
 * DEFAULT_SELECTION_CONTROL_EVENTS.
 */
export const DEFAULT_SELECTION_CONTROL_LAYER: SelectionControlLayer =
	"aboveHandles";

/**
 * Extracts the object type from a selection-control data-action
 * (`selection:<objectType>:<name>[:<sub>…]`), or null for any other action.
 * Gatekeeper for ControlEventHandler's registry fallback.
 */
export const parseSelectionControlObjectType = (
	targetAction: string,
): string | null => {
	const [namespace, objectType] = targetAction.split(":");
	return namespace === SELECTION_CONTROL_NAMESPACE && objectType
		? objectType
		: null;
};

/** Whether the definition asked for this event kind. */
const isOfferedEventType = (
	definition: SelectionControlDefinition,
	type: EventType,
): type is SelectionControlEventType => {
	const offered: readonly string[] =
		definition.events ?? DEFAULT_SELECTION_CONTROL_EVENTS;
	return offered.includes(type);
};

/**
 * Whether the object is the whole object selection — the only case a part
 * selection can stand on it (SelectionControlsLayer draws controls for it alone).
 */
const isSoleSelection = (
	state: CanvasControllerState,
	objectId: string,
): boolean => {
	const { objectIds } = state.selection;
	return objectIds.length === 1 && objectIds[0] === objectId;
};

/**
 * Internal adapter wrapping a SelectionControlDefinition as a ControlStrategy so
 * ControlEventHandler can route to it. Owns the data-action format end to end
 * (`action` is what the control's Component must render, and supports() matches it
 * exact or prefixed) and the whole state contract the definition is shielded
 * from: the dragStart UI reset, snapshot guards, the COW write-back, the
 * commit (a drag's is settled at its end whatever the definition returned
 * there), and installing the part selection.
 */
class SelectionControlStrategy extends ControlStrategy {
	readonly action: string;

	constructor(
		private readonly objectType: ObjectType,
		private readonly definition: SelectionControlDefinition,
	) {
		super();
		this.action = `${SELECTION_CONTROL_NAMESPACE}:${objectType}:${definition.name}`;
	}

	supports(event: CanvasEvent): boolean {
		if (event.targetKind !== "control" || !event.targetAction) {
			return false;
		}
		return (
			event.targetAction === this.action ||
			event.targetAction.startsWith(`${this.action}:`)
		);
	}

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		if (event.type === "dragStart") {
			return claimDrag(
				{ ...state, objectMenuOpenId: null, stencilLibraryOpenCategory: null },
				{ kind: "selectionControl" },
				{ edgeScroll: true },
			);
		}
		const appliedState = isOfferedEventType(this.definition, event.type)
			? this.applyEvent(state, event, event.type)
			: state;
		// A dragEnd the definition answered with an object has committed already;
		// any other end settles what the drag frames wrote.
		if (
			event.type !== "dragEnd" ||
			appliedState.commitVersion !== state.commitVersion
		) {
			return appliedState;
		}
		return this.commitDragIfChanged(appliedState, event.targetId);
	}

	/**
	 * Commits the drag's writes at its end when the definition did not: the
	 * object under the control no longer being the gesture-start snapshot's
	 * (by identity, as COW leaves an unwritten object as it was) means a drag
	 * frame wrote it. Returns the state unchanged otherwise, or when the object
	 * or its snapshot is missing.
	 */
	private commitDragIfChanged(
		state: CanvasControllerState,
		objectId: string | undefined,
	): CanvasControllerState {
		if (!objectId) {
			return state;
		}
		const object = state.objects[objectId];
		const startObject = this.readStartObject(state, objectId, "dragEnd");
		if (!object || !startObject || object === startObject) {
			return state;
		}
		return commitEdit(state);
	}

	/**
	 * Builds the definition's context and event, then writes its result back:
	 * the object via COW, with the ancestor group frames settled around whatever
	 * its new box turned out to be, and the part selection on that object.
	 * Returns the state unchanged when a guard fails or the definition reports no
	 * change.
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
		if (!object) {
			return state;
		}
		const startObject = this.readStartObject(state, objectId, type);
		if (!startObject) {
			return state;
		}

		const context: SelectionControlContext = {
			object,
			startObject,
			selectedPart: isSoleSelection(state, objectId)
				? state.selection.part
				: null,
		};
		const subAction = this.parseSubAction(event.targetAction);
		const controlEvent: SelectionControlEvent =
			type === "drag" || type === "dragEnd"
				? {
						type,
						start: event.start,
						last: event.last,
						delta: event.delta,
						mods: event.mods,
						subAction,
					}
				: { type, last: event.last, mods: event.mods, subAction };
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
				{ ...state, objects: updatedObjects },
				state,
			);
			// A drag writer commits once, on its last frame (handle() settles it when
			// dragEnd writes nothing); a click is its own last.
			if (type !== "drag") {
				nextState = commitEdit(nextState);
			}
		}
		if (result.selection !== undefined) {
			nextState = this.selectPart(nextState, objectId, result.selection);
		}
		return nextState;
	}

	/**
	 * The object the definition rebuilds its result from. A drag reads the
	 * gesture-start snapshot, so every frame is derived from where the object
	 * stood when the pointer went down; a click has moved nothing, so the current
	 * frame is its own start. Null when the drag has no snapshot, or the snapshot
	 * holds an object of another type under the id.
	 */
	private readStartObject(
		state: CanvasControllerState,
		objectId: string,
		type: SelectionControlEventType,
	): ObjectState | null {
		const startObject =
			type === "drag" || type === "dragEnd"
				? state.drag?.startSnapshot?.objects[objectId]
				: state.objects[objectId];
		return startObject && startObject.type === this.objectType
			? startObject
			: null;
	}

	/**
	 * Installs `part` as the part selection of the control's object. A part the
	 * type does not back is dropped by the reducer, as for every gesture
	 * (reconcileSelection). A control is drawn only over the sole selected
	 * object, so a selection that names anything else by now leaves the state as
	 * it is.
	 */
	private selectPart(
		state: CanvasControllerState,
		objectId: string,
		part: ObjectPartSelection | null,
	): CanvasControllerState {
		const { selection } = state;
		if (!isSoleSelection(state, objectId) || selection.part === part) {
			return state;
		}
		return { ...state, selection: { ...selection, part } };
	}

	/** The data-action segment after `${this.action}:`, or undefined when absent. */
	private parseSubAction(targetAction: string | undefined): string | undefined {
		const prefix = `${this.action}:`;
		return targetAction?.startsWith(prefix)
			? targetAction.slice(prefix.length)
			: undefined;
	}
}

/**
 * A selection control after registration: the definition's Component plus its
 * derived data-action, its resolved layer and the routing strategy. Consumed by
 * SelectionControlsLayer (action / Component / layer) and ControlEventHandler
 * (strategy).
 */
export type RegisteredSelectionControl = {
	action: string;
	Component: FC<SelectionControlProps>;
	/** The definition's `layer`, or DEFAULT_SELECTION_CONTROL_LAYER when it named none. */
	layer: SelectionControlLayer;
	strategy: ControlStrategy;
};

/**
 * Derives the data-action, layer and routing strategy for one control of the
 * given type.
 */
export const createRegisteredSelectionControl = (
	objectType: ObjectType,
	definition: SelectionControlDefinition,
): RegisteredSelectionControl => {
	const strategy = new SelectionControlStrategy(objectType, definition);
	return {
		action: strategy.action,
		Component: definition.Component,
		layer: definition.layer ?? DEFAULT_SELECTION_CONTROL_LAYER,
		strategy,
	};
};
