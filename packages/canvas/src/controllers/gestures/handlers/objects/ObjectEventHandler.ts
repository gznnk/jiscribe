import {
	calcFrameKeyPoints,
	calcKeyPointsBoundingBox,
	isTransformedFrame,
} from "@jiscribe/geometry";
import type {
	FrameKeyPoints,
	Point,
	TransformedFrame,
} from "@jiscribe/geometry";

import { determineSelection } from "./utils/determineSelection";
import { getAncestors } from "./utils/getAncestors";
import { ORIGIN_SNAP_PX } from "../../../../constants/axisLock";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../../../states/objects/base/TextStyleState";
import {
	readRichTextSlot,
	resolveTextSlotId,
} from "../../../../states/objects/types/TextSlots";
import type {
	AxisLockFeedback,
	CanvasControllerState,
	SnapFeedback,
} from "../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../registries/ICanvasRegistries";
import { buildSelectedIdsWithDescendants } from "../../../utils/buildSelectedIdsWithDescendants";
import { createMultiSelectGroup } from "../../../utils/createMultiSelectGroup";
import { moveSelection } from "../../../utils/moveSelection";
import { updateAffectedGroupBounds } from "../../../utils/updateAffectedGroupBounds";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import type { Mods } from "../../registry/ObjectBehaviorTypes";
import { commitTextEditUnlessTouchPress } from "../utils/commitTextEditUnlessTouchPress";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";
import {
	buildSnapFeedback,
	findSnap,
	SNAP_THRESHOLD_PX,
} from "../utils/snap/findSnap";

/**
 * Handles a click on an object.
 * Applies hierarchical selection logic and updates the selection state.
 */
function handleObjectClick(
	canvasState: CanvasControllerState,
	targetObject: ObjectState,
	mods: Mods,
): CanvasControllerState {
	// Determine the new selection via hierarchical selection logic
	const selectedIds = determineSelection(targetObject, canvasState, mods);

	// Return the current state if there is no change
	if (selectedIds === null) {
		return canvasState;
	}

	// For multi-selection, create a multiSelectGroup
	let multiSelectGroup = null;
	if (1 < selectedIds.length) {
		multiSelectGroup = createMultiSelectGroup(
			selectedIds,
			canvasState.objects,
			canvasState.multiSelectGroup,
		);
	}

	return {
		...canvasState,
		selectedIds,
		multiSelectGroup,
		// Clear the connector selection to guarantee mutual exclusion
		selectedConnectorId: null,
		// Clear the vertex selection
		selectedVertex: null,
		// Clear the text slot selection
		selectedTextSlot: null,
		// Close the submenu on selection change
		objectMenuOpenId: null,
		stencilLibraryOpenCategory: null,
	};
}

/**
 * Selects the text slot a click landed in, one level below the object selection.
 * The caller decides that the click addresses a slot; this only maps the pressed
 * element's [data-part] onto a slot of the shape.
 *
 * Unlike the double-click path it does not go through resolveTextSlotId: a click that
 * misses every slot (no [data-part], or one naming something else) must not select the
 * first slot by fallback, it steps back up to the object level by clearing the slot.
 */
function handleTextSlotClick(
	canvasState: CanvasControllerState,
	targetObject: ObjectState,
	targetPart: string | undefined,
): CanvasControllerState {
	if (
		targetObject.features?.text !== "slots" ||
		!isTextStyleState(targetObject)
	) {
		return canvasState;
	}

	const slots = targetObject.text;
	const slotId =
		slots !== undefined &&
		targetPart !== undefined &&
		Object.prototype.hasOwnProperty.call(slots, targetPart)
			? targetPart
			: null;

	// A slot change moves what the menu acts on, so it closes the open submenu just
	// as an object selection change does. Re-clicking the same slot changes nothing
	// and returns the state untouched, leaving the submenu as it was.
	const currentSlot = canvasState.selectedTextSlot;
	if (slotId === null) {
		return currentSlot === null
			? canvasState
			: { ...canvasState, selectedTextSlot: null, objectMenuOpenId: null };
	}
	if (
		currentSlot?.objectId === targetObject.id &&
		currentSlot.slotId === slotId
	) {
		return canvasState;
	}
	return {
		...canvasState,
		selectedTextSlot: { objectId: targetObject.id, slotId },
		objectMenuOpenId: null,
	};
}

/**
 * Handles dragging an object.
 * Resolves each shape's moveByDelta dynamically via the registry.
 */
function handleObjectDrag(
	canvasState: CanvasControllerState,
	delta: Point,
	mods: Mods,
	registries: ICanvasRegistries,
): CanvasControllerState {
	const eventStartSnapshot = canvasState.eventStartSnapshot;
	if (!eventStartSnapshot) {
		return canvasState;
	}

	const eventStartObjects = eventStartSnapshot.objects;
	const selectedIds = canvasState.selectedIds;

	// --- Axis lock via Shift ---
	// While Shift is held, movement is locked to one axis. The locked axis (lockedAxis)
	// is the one with the smaller absolute cumulative delta, and movement occurs only
	// along the direction with the larger absolute value. Since it is judged by the
	// cumulative amount, the locked axis follows if the larger direction swaps during the drag.
	const lockedAxis: "x" | "y" | null = mods.shift
		? Math.abs(delta.x) >= Math.abs(delta.y)
			? "y"
			: "x"
		: null;

	const zoom = canvasState.viewport.zoom;

	// While axis-locked, if the free axis (the moving side) has only a slight movement, snap to the start position.
	// To indicate alignment with the start position via both-axis guides, feedback is set on both axes later.
	const freeAxisDelta = lockedAxis === "x" ? delta.y : delta.x;
	const snapToOrigin =
		lockedAxis !== null && Math.abs(freeAxisDelta) <= ORIGIN_SNAP_PX / zoom;

	const constrainedDelta: Point = snapToOrigin
		? { x: 0, y: 0 }
		: {
				x: lockedAxis === "x" ? 0 : delta.x,
				y: lockedAxis === "y" ? 0 : delta.y,
			};

	// --- Snap correction ---
	let adjustedDelta = constrainedDelta;
	let snapFeedback: SnapFeedback = { x: [], y: [] };

	// Snap candidates use the cached set of all objects from dragStart by reference only.
	// Exclusions (selection + all descendants) are not filtered out of the array; a Set is passed to findSnap and filtered internally.
	const snapCandidates = eventStartSnapshot.snapCandidates;
	const excludeIds = eventStartSnapshot.selectedIdsWithDescendants;
	const snapSourceId =
		selectedIds.length > 1
			? eventStartSnapshot.multiSelectGroup?.id
			: selectedIds[0];
	const snapSourceKeyPoints: FrameKeyPoints | undefined = snapSourceId
		? eventStartSnapshot.keyPoints[snapSourceId]
		: undefined;

	if (snapSourceKeyPoints && !mods.ctrl && !snapToOrigin) {
		const bbox = calcKeyPointsBoundingBox(snapSourceKeyPoints);
		const selectedBBox = {
			left: bbox.left + constrainedDelta.x,
			right: bbox.right + constrainedDelta.x,
			top: bbox.top + constrainedDelta.y,
			bottom: bbox.bottom + constrainedDelta.y,
		};

		// Include the center (midpoint) in the drag-side edge values too, to enable center↔center / center↔edge snapping
		const selectedCenterX = (selectedBBox.left + selectedBBox.right) / 2;
		const selectedCenterY = (selectedBBox.top + selectedBBox.bottom) / 2;
		// To keep the locked axis unmoved even by snap correction, empty that axis's edge values to skip it
		const result = findSnap(
			snapCandidates,
			SNAP_THRESHOLD_PX / zoom,
			lockedAxis === "x"
				? []
				: [selectedBBox.left, selectedCenterX, selectedBBox.right],
			lockedAxis === "y"
				? []
				: [selectedBBox.top, selectedCenterY, selectedBBox.bottom],
			excludeIds,
		);
		adjustedDelta = {
			x: constrainedDelta.x + result.delta.x,
			y: constrainedDelta.y + result.delta.y,
		};
		const actualBBox = {
			left: selectedBBox.left + result.delta.x,
			right: selectedBBox.right + result.delta.x,
			top: selectedBBox.top + result.delta.y,
			bottom: selectedBBox.bottom + result.delta.y,
		};
		snapFeedback = buildSnapFeedback(
			actualBBox,
			result.xResult,
			result.yResult,
			snapCandidates,
			excludeIds,
		);
	}

	// --- Shift axis-lock feedback ---
	// Determine the position of the guide line (a line spanning the whole viewport) indicating the movable axis direction.
	// Normally one line depending on the locked axis (vertical move = vertical line x / horizontal move = horizontal line y).
	// During origin snap, both axes (x and y) are shown to indicate alignment with the start position.
	// The actual drawing is handled by the dedicated AxisLockGuide component.
	let axisLockFeedback: AxisLockFeedback | null = null;
	if (lockedAxis && snapSourceKeyPoints) {
		const baseBBox = calcKeyPointsBoundingBox(snapSourceKeyPoints);
		const centerX = (baseBBox.left + baseBBox.right) / 2;
		const centerY = (baseBBox.top + baseBBox.bottom) / 2;
		if (snapToOrigin) {
			axisLockFeedback = { x: centerX, y: centerY };
		} else if (lockedAxis === "y") {
			// Horizontal move: horizontal line through the center Y
			axisLockFeedback = { y: centerY };
		} else {
			// Vertical move: vertical line through the center X
			axisLockFeedback = { x: centerX };
		}
	}

	// --- Move all selected objects by adjustedDelta (shared with nudge move) ---
	// Dragging moves by the cumulative delta from the drag-start snapshot as the source.
	// Parent group bounds updates are done together on dragEnd, not here.
	const eventStartMultiSelectGroup = eventStartSnapshot.multiSelectGroup;
	const { objects: updatedObjects, multiSelectGroup: movedMultiSelectGroup } =
		moveSelection({
			selectedIds,
			srcObjects: eventStartObjects,
			srcMultiSelectGroup: eventStartMultiSelectGroup,
			delta: adjustedDelta,
			objectBehavior: registries.objectBehavior,
		});

	const nextState = {
		...canvasState,
		objects: updatedObjects,
		snapFeedback,
		axisLockFeedback,
	};

	// Move multiSelectGroup in sync as well (only when multi-selection is maintained during the drag)
	if (canvasState.multiSelectGroup && movedMultiSelectGroup) {
		nextState.multiSelectGroup = movedMultiSelectGroup;
	}

	return nextState;
}

/**
 * Handles selection at the start of a drag.
 */
function handleObjectDragStart(
	canvasState: CanvasControllerState,
	targetObject: ObjectState,
	delta: Point,
	mods: Mods,
	registries: ICanvasRegistries,
): CanvasControllerState {
	const { id } = targetObject;

	// Determine the selection state
	const isCurrentlySelected = canvasState.selectedIds.includes(id);
	const ancestors = getAncestors(canvasState, id);
	const isAncestorSelected = ancestors.some((ancestorId) =>
		canvasState.selectedIds.includes(ancestorId),
	);

	let selectedIds: string[];
	let newMultiSelectGroup = canvasState.multiSelectGroup;
	// The multiSelectGroup and keyPoints updates to set on eventStartSnapshot
	let eventStartMultiSelectGroup =
		canvasState.eventStartSnapshot?.multiSelectGroup ?? null;
	let keyPoints = canvasState.eventStartSnapshot?.keyPoints ?? {};

	if (isCurrentlySelected || isAncestorSelected) {
		// Already selected: keep the current selection
		selectedIds = canvasState.selectedIds;
	} else {
		// Not selected: apply hierarchical selection logic
		const newSelection = determineSelection(targetObject, canvasState, mods);
		selectedIds = newSelection ?? canvasState.selectedIds;

		// Create/update multiSelectGroup as the number of selected shapes increases
		const eventStartObjects =
			canvasState.eventStartSnapshot?.objects ?? canvasState.objects;
		newMultiSelectGroup =
			selectedIds.length > 1
				? createMultiSelectGroup(
						selectedIds,
						eventStartObjects,
						canvasState.multiSelectGroup,
					)
				: null;
		eventStartMultiSelectGroup = newMultiSelectGroup;

		// Also add the keyPoints of the new multiSelectGroup
		if (newMultiSelectGroup && isTransformedFrame(newMultiSelectGroup)) {
			keyPoints = {
				...keyPoints,
				[newMultiSelectGroup.id]: calcFrameKeyPoints(
					newMultiSelectGroup as TransformedFrame,
				),
			};
		}
	}

	// Re-cache the exclusion set with the selectedIds finalized after dragStart
	// (refresh the snapshot if the selection changed from what it was when handleGesture was built)
	const selectedIdsWithDescendants = canvasState.eventStartSnapshot
		? buildSelectedIdsWithDescendants(
				selectedIds,
				canvasState.eventStartSnapshot.objects,
			)
		: null;

	// Update the selection state and enable edge scrolling
	const nextState = {
		...canvasState,
		selectedIds,
		multiSelectGroup: newMultiSelectGroup,
		activeDragKind: "move" as const,
		edgeScrollEnabled: true,
		// Clear the connector selection to guarantee mutual exclusion
		selectedConnectorId: null,
		// Clear the vertex selection
		selectedVertex: null,
		// Clear the text slot selection
		selectedTextSlot: null,
		// Close the object menu dropdown at drag start
		objectMenuOpenId: null,
		stencilLibraryOpenCategory: null,
		eventStartSnapshot: canvasState.eventStartSnapshot
			? {
					...canvasState.eventStartSnapshot,
					multiSelectGroup: eventStartMultiSelectGroup,
					keyPoints,
					...(selectedIdsWithDescendants && { selectedIdsWithDescendants }),
				}
			: null,
	};

	// Run the drag handling
	return handleObjectDrag(nextState, delta, mods, registries);
}

/**
 * Handles the end of a drag.
 */
function handleObjectDragEnd(
	canvasState: CanvasControllerState,
	delta: Point,
	mods: Mods,
	registries: ICanvasRegistries,
): CanvasControllerState {
	// Disable edge scrolling
	const nextState = {
		...canvasState,
		edgeScrollEnabled: false,
	};

	// Final drag handling
	const resultState = handleObjectDrag(nextState, delta, mods, registries);

	// Update the parent groups' bounding boxes
	return updateAffectedGroupBounds(resultState, resultState.selectedIds);
}

/**
 * Handles events that occur on objects (not on canvas).
 * This is the main entry point for object-level event handling.
 *
 * Shape-agnostic, since each shape's handling is resolved dynamically via the registry.
 *
 * Note: eventStartSnapshot is managed by handleGesture(), not here.
 */
export const ObjectEventHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return event.targetKind === "object" && isPerTargetInteraction(event);
	},

	handle(state, event, registries) {
		// Any event that reaches this handler is outside the text-editing overlay
		// (the overlay covers the edited shape's bbox and is gesture-excluded), so a
		// pending edit is committed first, like any outside tap — deferred only for
		// a touch press (see commitTextEditUnlessTouchPress).
		let nextState = commitTextEditUnlessTouchPress(state, event);

		const targetObjectId = event.targetId;
		if (!targetObjectId) {
			return nextState;
		}

		const targetObject = nextState.objects[targetObjectId];
		if (!targetObject) {
			return nextState;
		}

		// Handle Pointer Down
		if (event.type === "pressed") {
			// Close the context menu on press
			nextState = {
				...nextState,
				contextMenuPosition: null,
			};
		}

		// Handle the click event
		if (event.type === "click") {
			const afterClick = handleObjectClick(nextState, targetObject, event.mods);
			// A click that leaves the selection as it was, on the object that is already
			// the whole selection, addresses a text slot inside it instead. Any modifier
			// belongs to selection editing, so it is left to handleObjectClick alone.
			const addressesTextSlot =
				afterClick === nextState &&
				!event.mods.ctrl &&
				!event.mods.meta &&
				!event.mods.shift &&
				!event.mods.alt &&
				nextState.selectedIds.length === 1 &&
				nextState.selectedIds[0] === targetObject.id;
			if (!addressesTextSlot) {
				return afterClick;
			}
			return handleTextSlotClick(afterClick, targetObject, event.targetPart);
		}

		// Handle the double-click event
		if (event.type === "doubleClick") {
			// Start text editing only for shapes that have text (features.text, in
			// either shape). isTextStyleState is a loose guard that only checks whether
			// the text attributes are consistent, so it also lets through shapes with no
			// text at all (svg / polyline / polygon, etc.). Treat the same features.text
			// used by the property-update side (TextSlotStyleProperty) as authoritative.
			const features = targetObject.features;
			if (features?.text !== undefined && isTextStyleState(targetObject)) {
				// The pressed element's [data-part] names the slot (as it does for a
				// connector's label). It comes from the DOM, so resolveTextSlotId
				// honors it only when it matches a slot and otherwise opens the first.
				const slotId = resolveTextSlotId(targetObject.text, event.targetPart);
				if (slotId === undefined) {
					return nextState;
				}
				return {
					...nextState,
					// The click that precedes the double-click leaves an already-selected
					// slot untouched, so the submenu open over it is closed here.
					objectMenuOpenId: null,
					textEditState: {
						kind: "shape",
						objectId: targetObject.id,
						slotId,
						text: readRichTextSlot(targetObject.text, slotId),
					},
				};
			}
			return nextState;
		}

		// Handle the drag events
		const objectStartState =
			nextState.eventStartSnapshot?.objects[targetObjectId];
		if (!objectStartState) {
			return nextState;
		}

		if (event.type === "dragStart") {
			return handleObjectDragStart(
				nextState,
				objectStartState,
				event.delta,
				event.mods,
				registries,
			);
		} else if (event.type === "drag") {
			return handleObjectDrag(nextState, event.delta, event.mods, registries);
		} else if (event.type === "dragEnd") {
			return handleObjectDragEnd(
				nextState,
				event.delta,
				event.mods,
				registries,
			);
		}

		return nextState;
	},
};
