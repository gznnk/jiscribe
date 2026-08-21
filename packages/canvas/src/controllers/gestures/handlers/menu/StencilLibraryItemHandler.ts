import type { BoundingBox } from "@jiscribe/geometry";

import { createObjectDoc } from "../../../../schemas/objects/utils/createObjectDoc";
import type { ObjectFactoryRegistry } from "../../../../schemas/registry/ObjectFactoryRegistry";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../registries/ICanvasRegistries";
import type { Stencil } from "../../../ui/objects/Stencil";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";
import {
	SNAP_THRESHOLD_PX,
	buildSnapFeedback,
	findSnap,
} from "../utils/snap/findSnap";

/**
 * Extracts the preset ID from a targetPart.
 * Format: "item:<presetId>"
 *
 * Splitting is enough because a preset id holds no colon of its own — StencilRegistry
 * refuses one that does, rather than letting it reach here and resolve to nothing.
 */
const parsePresetId = (targetPart: string): string => targetPart.split(":")[1];

/**
 * Returns the half-size of the ghost shape for a preset.
 * Delegates to each shape's ObjectFactory (no per-type branching here).
 */
const calcObjectDimensions = (
	preset: Stencil,
	objectFactory: ObjectFactoryRegistry,
): { halfWidth: number; halfHeight: number } => {
	const factory = objectFactory.get(preset.objectType);
	if (!factory) {
		throw new Error(`Unsupported object type for menu: ${preset.objectType}`);
	}
	return factory.calcDimensions(preset.defaultOverrides);
};

/**
 * Adds a shape to the state according to the preset and returns a new CanvasControllerState.
 *
 * Adding an object always modifies the doc, so commitVersion is incremented.
 * This ensures history recording and saving happen even via click (center placement).
 * Via dragEnd, handleGesture overwrites with the same value, so there is no double increment.
 */
const addObjectToState = (
	state: CanvasControllerState,
	preset: Stencil,
	position: { x: number; y: number },
	registries: ICanvasRegistries,
): CanvasControllerState => {
	const doc = createObjectDoc(
		preset.objectType,
		position,
		registries.objectFactory,
		preset.defaultOverrides,
	);
	const objectState = registries.objectMapper.toState(doc);

	return {
		...state,
		objects: {
			...state.objects,
			[objectState.id]: objectState,
		},
		rootIds: [...state.rootIds, objectState.id],
		selectedIds: [objectState.id],
		commitVersion: state.commitVersion + 1,
	};
};

/**
 * Gesture handler for StencilLibrary items.
 * Handles dragging from the StencilLibrary (with edge scrolling) and center placement on press.
 */
export const StencilLibraryItemHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return (
			event.targetKind === "menu" &&
			event.targetId === "stencil-library" &&
			isPerTargetInteraction(event)
		);
	},

	handle(state, event, registries) {
		let nextState = state;

		// Pressing on a menu item closes the context menu (the press itself does not place or draw)
		if (event.type === "pressed") {
			nextState = { ...nextState, contextMenuPosition: null };
		}

		if (!event.targetPart) {
			return nextState;
		}

		const presetId = parsePresetId(event.targetPart);
		const preset = registries.stencil.get(presetId);
		if (!preset) {
			return nextState;
		}

		switch (event.type) {
			case "click": {
				// Shapes that don't support bounds drawing are placed at the viewport center;
				// shapes that do (rect / ellipse / polyline) toggle drawing mode
				if (
					!registries.objectFactory.supportsBoundsDrawing(preset.objectType)
				) {
					const { minX, minY, width, height, zoom } = state.viewport;
					const centerX = minX + width / zoom / 2;
					const centerY = minY + height / zoom / 2;
					const placed = addObjectToState(
						state,
						preset,
						{
							x: centerX,
							y: centerY,
						},
						registries,
					);
					// If a non-drawable shape is pressed while in drawing mode, clear drawing mode.
					// Using a shape item also dismisses any open category flyout (see objectMenu).
					return {
						...placed,
						shapeDrawing: null,
						stencilLibraryOpenCategory: null,
					};
				}

				const isActive = state.shapeDrawing?.preset.id === presetId;

				if (isActive) {
					return {
						...state,
						shapeDrawing: null,
						stencilLibraryOpenCategory: null,
					};
				}

				// Drawing mode ON: commit any text edit and clear the selection
				const committed = commitTextEditIfNeeded(state);
				return {
					...committed,
					shapeDrawing: { preset, preview: null },
					selectedIds: [],
					selectedConnectorId: null,
					multiSelectGroup: null,
					objectMenuOpenId: null,
					stencilLibraryOpenCategory: null,
				};
			}

			case "dragStart": {
				// Commit any text edit and clear the selection before starting drag-and-drop
				// On drag-and-drop start, clear drawing mode (regardless of shape type)
				const committed = commitTextEditIfNeeded(state);
				return {
					...committed,
					shapeDrawing: null,
					selectedIds: [],
					selectedConnectorId: null,
					multiSelectGroup: null,
					objectMenuOpenId: null,
					stencilLibraryOpenCategory: null,
					stencilLibraryDrag: {
						preset,
						ghostPosition: event.last,
						objectDimensions: calcObjectDimensions(
							preset,
							registries.objectFactory,
						),
					},
					edgeScrollEnabled: true,
				};
			}

			case "drag": {
				const snapCandidates = state.eventStartSnapshot?.snapCandidates;
				const drag = state.stencilLibraryDrag;

				if (!snapCandidates || !drag || event.mods.ctrl) {
					return {
						...state,
						stencilLibraryDrag: drag
							? { ...drag, ghostPosition: event.last }
							: null,
						snapFeedback: null,
					};
				}

				const pos = event.last;
				const { halfWidth, halfHeight } = drag.objectDimensions;
				const rawBBox: BoundingBox = {
					left: pos.x - halfWidth,
					right: pos.x + halfWidth,
					top: pos.y - halfHeight,
					bottom: pos.y + halfHeight,
				};

				const zoom = state.viewport.zoom;
				// Include the center (midpoint) among the drag-side edge values so center↔center / center↔edge can snap
				const rawCenterX = (rawBBox.left + rawBBox.right) / 2;
				const rawCenterY = (rawBBox.top + rawBBox.bottom) / 2;
				const result = findSnap(
					snapCandidates,
					SNAP_THRESHOLD_PX / zoom,
					[rawBBox.left, rawCenterX, rawBBox.right],
					[rawBBox.top, rawCenterY, rawBBox.bottom],
				);

				const actualBBox: BoundingBox = {
					left: rawBBox.left + result.delta.x,
					right: rawBBox.right + result.delta.x,
					top: rawBBox.top + result.delta.y,
					bottom: rawBBox.bottom + result.delta.y,
				};

				return {
					...state,
					stencilLibraryDrag: {
						...drag,
						ghostPosition: {
							x: pos.x + result.delta.x,
							y: pos.y + result.delta.y,
						},
					},
					snapFeedback: buildSnapFeedback(
						actualBBox,
						result.xResult,
						result.yResult,
						snapCandidates,
					),
				};
			}

			case "dragEnd": {
				// Use the last snapped ghostPosition as the placement coordinate
				const drag = state.stencilLibraryDrag;
				if (!drag) {
					return state;
				}
				const position = drag.ghostPosition ?? event.last;
				const placed = addObjectToState(
					state,
					drag.preset,
					position,
					registries,
				);
				return {
					...placed,
					stencilLibraryDrag: null,
					edgeScrollEnabled: false,
				};
			}

			default:
				return nextState;
		}
	},
};
