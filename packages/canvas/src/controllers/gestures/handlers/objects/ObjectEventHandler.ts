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

import { applyObjectSelection } from "./utils/applyObjectSelection";
import { determineSelection } from "./utils/determineSelection";
import { getAncestors } from "./utils/getAncestors";
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
import type { ObjectPartKindRegistry } from "../../../selection/ObjectPartKindRegistry";
import { selectTextSlot } from "../../../selection/selectTextSlot";
import { buildSelectedIdsWithDescendants } from "../../../utils/buildSelectedIdsWithDescendants";
import { commitEditIfChanged } from "../../../utils/commitEdit";
import { createMultiSelectGroup } from "../../../utils/createMultiSelectGroup";
import { moveSelection } from "../../../utils/moveSelection";
import { updateAffectedGroupBounds } from "../../../utils/updateAffectedGroupBounds";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { applyPartClick } from "../utils/applyPartClick";
import { ORIGIN_SNAP_PX } from "../utils/axisLock";
import { commitTextEditUnlessTouchPress } from "../utils/commitTextEditUnlessTouchPress";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";
import { parsePartAddress, readTextSlotPart } from "../utils/partAddress";
import {
	buildSnapFeedback,
	findSnap,
	SNAP_THRESHOLD_PX,
} from "../utils/snap/findSnap";
import { isSnapSuppressed } from "../utils/snap/isSnapSuppressed";

/**
 * Moves the focus of the active range (the last one) to the part a Shift-click
 * landed on, its anchor staying where it is. Only a part of the kind already
 * picked, on the object that is the whole selection, extends; anything else is
 * no extension and is left to the object-level path.
 *
 * Not committed: a selection change is no edit of the document.
 *
 * @param state - Current canvas controller state
 * @param object - The object the click landed on, as the entry from
 *   `state.objects`
 * @param targetPart - The pressed element's [data-part]; untrusted DOM text,
 *   honored only once its kind is the picked one and its id passes that kind's
 *   `has`
 * @param objectPartKind - The registry the kind and the id are checked against
 * @returns The state with the focus moved, `state` itself when the focus already
 *   is that part, or null when the click is no extension
 */
const extendPartRange = (
	state: CanvasControllerState,
	object: ObjectState,
	targetPart: string | undefined,
	objectPartKind: ObjectPartKindRegistry,
): CanvasControllerState | null => {
	const { objectIds, part } = state.selection;
	const address = parsePartAddress(targetPart);
	if (
		part === null ||
		objectIds.length !== 1 ||
		objectIds[0] !== object.id ||
		address === null ||
		address.kind !== part.kind
	) {
		return null;
	}
	const definition = objectPartKind.get(object.type, address.kind);
	if (definition === undefined || !definition.has(object, address.partId)) {
		return null;
	}

	const activeRange = part.ranges[part.ranges.length - 1];
	if (activeRange.focusId === address.partId) {
		return state;
	}
	// What the menu acts on moves with the range, so the open submenu closes just
	// as it does on a plain part click (applyPartClick).
	return {
		...state,
		selection: {
			...state.selection,
			part: {
				kind: part.kind,
				ranges: [
					...part.ranges.slice(0, -1),
					{ anchorId: activeRange.anchorId, focusId: address.partId },
				],
			},
		},
		objectMenuOpenId: null,
		stencilLibraryOpenCategory: null,
	};
};

/**
 * Handles dragging an object.
 * Resolves each shape's moveByDelta dynamically via the registry.
 */
function handleObjectDrag(
	canvasState: CanvasControllerState,
	event: CanvasEvent,
	registries: ICanvasRegistries,
): CanvasControllerState {
	const { delta, mods } = event;
	const dragStartSnapshot = canvasState.activeDrag?.startSnapshot;
	if (!dragStartSnapshot) {
		return canvasState;
	}

	const eventStartObjects = dragStartSnapshot.objects;
	const selectedIds = canvasState.selection.objectIds;

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
	const snapCandidates = dragStartSnapshot.snapCandidates;
	const excludeIds = dragStartSnapshot.selectedIdsWithDescendants;
	const snapSourceId =
		selectedIds.length > 1
			? dragStartSnapshot.multiSelectGroup?.id
			: selectedIds[0];
	const snapSourceKeyPoints: FrameKeyPoints | undefined = snapSourceId
		? dragStartSnapshot.keyPoints[snapSourceId]
		: undefined;

	if (snapSourceKeyPoints && !isSnapSuppressed(event) && !snapToOrigin) {
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
	const eventStartMultiSelectGroup = dragStartSnapshot.multiSelectGroup;
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
	event: CanvasEvent,
	registries: ICanvasRegistries,
): CanvasControllerState {
	const { id } = targetObject;
	const { mods } = event;

	// Determine the selection state
	const isCurrentlySelected = canvasState.selection.objectIds.includes(id);
	const ancestors = getAncestors(canvasState, id);
	const isAncestorSelected = ancestors.some((ancestorId) =>
		canvasState.selection.objectIds.includes(ancestorId),
	);

	let selectedIds: readonly string[];
	let newMultiSelectGroup = canvasState.multiSelectGroup;
	// The multiSelectGroup and keyPoints updates to set on the drag's start snapshot
	let eventStartMultiSelectGroup =
		canvasState.activeDrag?.startSnapshot.multiSelectGroup ?? null;
	let keyPoints = canvasState.activeDrag?.startSnapshot.keyPoints ?? {};

	if (isCurrentlySelected || isAncestorSelected) {
		// Already selected: keep the current selection
		selectedIds = canvasState.selection.objectIds;
	} else {
		// Not selected: apply hierarchical selection logic
		const newSelection = determineSelection(targetObject, canvasState, mods);
		selectedIds = newSelection ?? canvasState.selection.objectIds;

		// Create/update multiSelectGroup as the number of selected shapes increases
		const eventStartObjects =
			canvasState.activeDrag?.startSnapshot.objects ?? canvasState.objects;
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

	// Re-cache the exclusion set with the selection finalized after dragStart
	// (refresh the snapshot if the selection changed from what it was when handleGesture was built)
	const selectedIdsWithDescendants = canvasState.activeDrag
		? buildSelectedIdsWithDescendants(
				selectedIds,
				canvasState.activeDrag.startSnapshot.objects,
			)
		: null;

	// Update the selection state and enable edge scrolling
	const nextState = {
		...canvasState,
		// The picked part goes with the object selection that carried it.
		selection: { objectIds: selectedIds, part: null },
		multiSelectGroup: newMultiSelectGroup,
		edgeScrollEnabled: true,
		// Close the object menu dropdown at drag start
		objectMenuOpenId: null,
		stencilLibraryOpenCategory: null,
		activeDrag: canvasState.activeDrag
			? {
					startSnapshot: {
						...canvasState.activeDrag.startSnapshot,
						multiSelectGroup: eventStartMultiSelectGroup,
						keyPoints,
						...(selectedIdsWithDescendants && { selectedIdsWithDescendants }),
					},
					kind: "move" as const,
				}
			: null,
	};

	// Run the drag handling
	return handleObjectDrag(nextState, event, registries);
}

/**
 * Handles the end of a drag.
 */
function handleObjectDragEnd(
	canvasState: CanvasControllerState,
	event: CanvasEvent,
	registries: ICanvasRegistries,
): CanvasControllerState {
	const closingState = { ...canvasState, edgeScrollEnabled: false };
	const draggedState = handleObjectDrag(closingState, event, registries);
	const committedState = commitEditIfChanged(closingState, draggedState);
	return updateAffectedGroupBounds(
		committedState,
		committedState.selection.objectIds,
	);
}

/**
 * Handles events that occur on objects (not on canvas).
 * This is the main entry point for object-level event handling.
 *
 * Shape-agnostic, since each shape's handling is resolved dynamically via the registry.
 *
 * Note: the drag's start snapshot is managed by handleGesture(), not here.
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
			// Shift over a part of the kind already picked grows that range. Left to
			// applyObjectSelection it would instead deselect the object, which the
			// modifier cannot mean while the pointer is aimed one level below it.
			// Ctrl / Meta, with or without Shift, keep toggling the object.
			if (event.mods.shift && !event.mods.ctrl && !event.mods.meta) {
				const extended = extendPartRange(
					nextState,
					targetObject,
					event.targetPart,
					registries.objectPartKind,
				);
				if (extended !== null) {
					return extended;
				}
			}
			const afterClick = applyObjectSelection(
				nextState,
				targetObject,
				event.mods,
			);
			// A click that leaves the selection as it was, on the object that is already
			// the whole selection, addresses a part inside it instead. Any modifier
			// belongs to selection editing, so it is left to applyObjectSelection alone.
			const addressesPart =
				afterClick === nextState &&
				!event.mods.ctrl &&
				!event.mods.meta &&
				!event.mods.shift &&
				!event.mods.alt &&
				nextState.selection.objectIds.length === 1 &&
				nextState.selection.objectIds[0] === targetObject.id;
			if (!addressesPart) {
				return afterClick;
			}
			return applyPartClick(
				afterClick,
				targetObject,
				event.targetPart,
				registries.objectPartKind,
			);
		}

		// Handle the double-click event
		if (event.type === "doubleClick") {
			// Start text editing only for shapes that have text (features.text, in
			// either shape). isTextStyleState is a loose guard that only checks whether
			// the text attributes are consistent, so it also lets through shapes with no
			// text at all (svg / polyline / polygon, etc.). Treat the same features.text
			// the style tables gate the text intents with (textStyleTable) as
			// authoritative.
			const features = targetObject.features;
			if (features?.text !== undefined && isTextStyleState(targetObject)) {
				// The pressed element's [data-part] names the slot. It comes from the
				// DOM, so resolveTextSlotId honors it only when it matches a slot and
				// otherwise opens the first.
				const slotId = resolveTextSlotId(
					targetObject.text,
					readTextSlotPart(event.targetPart),
				);
				if (slotId === undefined) {
					return nextState;
				}
				return {
					...nextState,
					// The slot being edited is the selection (see textEditState): the
					// click that precedes the double-click only selects the object, and
					// leaves the slot unselected unless the object already was the whole
					// selection (applyPartClick).
					selection: selectTextSlot(
						nextState.selection,
						targetObject,
						slotId,
						registries.objectPartKind,
					),
					// The click that precedes the double-click leaves an already-selected
					// slot untouched, so the submenu open over it is closed here.
					objectMenuOpenId: null,
					textEditState: {
						kind: "shape",
						text: readRichTextSlot(targetObject.text, slotId),
					},
				};
			}
			return nextState;
		}

		// Handle the drag events
		const objectStartState =
			nextState.activeDrag?.startSnapshot.objects[targetObjectId];
		if (!objectStartState) {
			return nextState;
		}

		if (event.type === "dragStart") {
			return handleObjectDragStart(
				nextState,
				objectStartState,
				event,
				registries,
			);
		} else if (event.type === "drag") {
			return handleObjectDrag(nextState, event, registries);
		} else if (event.type === "dragEnd") {
			return handleObjectDragEnd(nextState, event, registries);
		}

		return nextState;
	},
};
