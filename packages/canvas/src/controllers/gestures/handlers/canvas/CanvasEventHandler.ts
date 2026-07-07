import { roundToDecimal } from "@workspace/geometry";

import { collectIdsInArea } from "./utils/collectIdsInArea";
import { PRECISION } from "../../../../constants/precision";
import { ZOOM } from "../../../../constants/zoom";
import { createObjectDocFromBounds } from "../../../../schemas/objects/utils/createObjectDocFromBounds";
import { shapeFactoryRegistry } from "../../../../schemas/registry/ShapeFactoryRegistry";
import { objectMapperRegistry } from "../../../../states/registry/ObjectMapperRegistry";
import type { SnapFeedback } from "../../../CanvasTypes";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";
import { createMultiSelectGroup } from "../../../utils/createMultiSelectGroup";
import type { GestureHandler } from "../../registry/GestureHandlerTypes";
import { autoSelectParentGroups } from "../objects/utils/autoSelectParentGroups";
import {
	SNAP_THRESHOLD_PX,
	buildSnapFeedback,
	findSnap,
} from "../utils/snap/findSnap";

/**
 * Handles events that occur on the canvas.
 * Middle- and right-button interactions are also treated as canvas-level
 * behavior so grab-scroll and context menus work consistently above objects
 * and controls. Middle button pans only; right button pans and opens the
 * context menu.
 */
export const CanvasEventHandler: GestureHandler = {
	supports(event): boolean {
		return (
			event.targetKind === "canvas" || event.button === 1 || event.button === 2
		);
	},

	handle(state, event) {
		// Zoom handling
		// Handle before commitTextEditIfNeeded so zooming does not interrupt an active text edit.
		if (event.type === "zoom" && event.zoomDelta != null) {
			const deltaY = event.zoomDelta;
			const zoomDelta = deltaY > 0 ? ZOOM.OUT_FACTOR : ZOOM.IN_FACTOR;
			const newZoom = Math.max(
				ZOOM.MIN,
				Math.min(ZOOM.MAX, state.viewport.zoom * zoomDelta),
			);
			const { minX, minY, width, height, zoom } = state.viewport;
			const currentViewBoxWidth = width / zoom;
			const currentViewBoxHeight = height / zoom;
			const newViewBoxWidth = width / newZoom;
			const newViewBoxHeight = height / newZoom;
			const offsetX = (event.last.x - minX) / currentViewBoxWidth;
			const offsetY = (event.last.y - minY) / currentViewBoxHeight;
			const newMinX = event.last.x - newViewBoxWidth * offsetX;
			const newMinY = event.last.y - newViewBoxHeight * offsetY;

			return {
				...state,
				viewport: {
					...state.viewport,
					zoom: roundToDecimal(newZoom, PRECISION.ZOOM),
					minX: roundToDecimal(newMinX, PRECISION.COORDINATE),
					minY: roundToDecimal(newMinY, PRECISION.COORDINATE),
				},
			};
		}

		// Scroll handling (wheel scroll + edge scroll)
		// As with zoom, update only the viewport without interrupting text editing.
		if (event.type === "scroll" && event.scrollDelta) {
			const { deltaX, deltaY } = event.scrollDelta;
			const svgDeltaX = deltaX / state.viewport.zoom;
			const svgDeltaY = deltaY / state.viewport.zoom;

			return {
				...state,
				viewport: {
					...state.viewport,
					minX: roundToDecimal(
						state.viewport.minX + svgDeltaX,
						PRECISION.COORDINATE,
					),
					minY: roundToDecimal(
						state.viewport.minY + svgDeltaY,
						PRECISION.COORDINATE,
					),
				},
			};
		}

		// Commit text editing if active
		let nextState = commitTextEditIfNeeded(state);

		// Middle-/right-button drag for viewport panning (GrabScroll).
		// Middle button (1) pans only; right button (2) also opens the context
		// menu on click. (#159)
		if (event.button === 1 || event.button === 2) {
			if (event.button === 2 && event.type === "click") {
				nextState = {
					...nextState,
					contextMenuPosition: {
						clientX: event.clientLast.x,
						clientY: event.clientLast.y,
					},
				};
			}

			if (event.type === "drag") {
				// Calculate viewport offset from the initial state
				// Use clientDelta (screen pixels) directly for viewport panning
				const initialViewport =
					state.eventStartSnapshot?.viewport ?? state.viewport;
				const deltaX = event.clientDelta.x / initialViewport.zoom;
				const deltaY = event.clientDelta.y / initialViewport.zoom;

				nextState = {
					...nextState,
					viewport: {
						...initialViewport,
						minX: roundToDecimal(
							initialViewport.minX - deltaX,
							PRECISION.COORDINATE,
						),
						minY: roundToDecimal(
							initialViewport.minY - deltaY,
							PRECISION.COORDINATE,
						),
					},
				};
			}
			return nextState;
		}

		// Left-button drag in draw mode: only shapes that support bounds drawing
		const shapeDrawing = nextState.shapeDrawing;
		const drawingObjectType =
			shapeDrawing !== null &&
			shapeFactoryRegistry.supportsBoundsDrawing(shapeDrawing.preset.objectType)
				? shapeDrawing.preset.objectType
				: null;
		if (
			event.button === 0 &&
			shapeDrawing !== null &&
			drawingObjectType !== null
		) {
			if (event.type === "dragStart") {
				nextState = {
					...nextState,
					shapeDrawing: {
						preset: shapeDrawing.preset,
						preview: {
							startX: event.start.x,
							startY: event.start.y,
							endX: event.start.x,
							endY: event.start.y,
						},
					},
					edgeScrollEnabled: true,
				};
				return nextState;
			}

			if (event.type === "drag") {
				const currentShapeDrawing = nextState.shapeDrawing;
				const currentPreview = currentShapeDrawing?.preview;
				if (!currentShapeDrawing || !currentPreview) {
					return nextState;
				}

				let endX = event.last.x;
				let endY = event.last.y;
				let snapFeedback: SnapFeedback = { x: [], y: [] };

				const snapCandidates = nextState.eventStartSnapshot?.snapCandidates;
				if (snapCandidates && !event.mods.ctrl) {
					const result = findSnap(
						snapCandidates,
						SNAP_THRESHOLD_PX / nextState.viewport.zoom,
						[endX],
						[endY],
					);
					endX += result.delta.x;
					endY += result.delta.y;

					const pointBBox = {
						left: endX,
						right: endX,
						top: endY,
						bottom: endY,
					};
					snapFeedback = buildSnapFeedback(
						pointBBox,
						result.xResult,
						result.yResult,
						snapCandidates,
					);
				}

				nextState = {
					...nextState,
					shapeDrawing: {
						...currentShapeDrawing,
						preview: {
							...currentPreview,
							endX,
							endY,
						},
					},
					snapFeedback,
				};
				return nextState;
			}

			if (event.type === "dragEnd" && nextState.shapeDrawing?.preview) {
				// endX/endY are already snapped during the drag event, so use the preview values as-is.
				const { startX, startY, endX, endY } = nextState.shapeDrawing.preview;
				const doc = createObjectDocFromBounds(
					drawingObjectType,
					startX,
					startY,
					endX,
					endY,
					nextState.shapeDrawing.preset.defaultOverrides,
					undefined,
					nextState.docDefaults,
				);

				if (doc) {
					const objectState = objectMapperRegistry.toState(doc);
					nextState = {
						...nextState,
						objects: { ...nextState.objects, [objectState.id]: objectState },
						rootIds: [...nextState.rootIds, objectState.id],
						selectedIds: [objectState.id],
					};
				}

				return {
					...nextState,
					shapeDrawing: null,
					edgeScrollEnabled: false,
				};
			}

			if (event.type === "click") {
				return {
					...nextState,
					shapeDrawing: null,
				};
			}

			return nextState;
		}

		// Left-button drag for area selection
		if (event.button === 0) {
			if (event.type === "dragStart") {
				nextState = {
					...nextState,
					areaSelection: {
						startX: event.start.x,
						startY: event.start.y,
						endX: event.last.x,
						endY: event.last.y,
					},
					selectedIds: [],
					selectedConnectorId: null,
					selectedVertex: null,
					edgeScrollEnabled: true,
					objectMenuOpenId: null,
				};
				return nextState;
			}

			if (event.type === "drag" && nextState.areaSelection) {
				const area = nextState.areaSelection;
				const endX = event.last.x;
				const endY = event.last.y;
				const areaMinX = Math.min(area.startX, endX);
				const areaMinY = Math.min(area.startY, endY);
				const areaMaxX = Math.max(area.startX, endX);
				const areaMaxY = Math.max(area.startY, endY);

				// bboxes were built once at dragStart; objects do not move during a marquee,
				// so containment is a pure O(N) scan with no per-frame bbox recomputation (#124).
				const bboxes = nextState.eventStartSnapshot?.bboxes ?? {};
				const hitIds = collectIdsInArea(
					bboxes,
					areaMinX,
					areaMinY,
					areaMaxX,
					areaMaxY,
				);

				const selectedIds = autoSelectParentGroups(nextState, hitIds);

				let multiSelectGroup = null;
				if (selectedIds.length > 1) {
					multiSelectGroup = createMultiSelectGroup(
						selectedIds,
						nextState.objects,
						state.multiSelectGroup,
						bboxes,
					);
				}

				nextState = {
					...nextState,
					areaSelection: { ...area, endX, endY },
					selectedIds,
					multiSelectGroup,
				};
				return nextState;
			}

			if (event.type === "dragEnd" && nextState.areaSelection) {
				nextState = {
					...nextState,
					areaSelection: null,
					edgeScrollEnabled: false,
				};
				return nextState;
			}
		}

		// Clear selection on press (left-click only)
		if (event.type === "pressed" && event.button === 0) {
			nextState = {
				...nextState,
				selectedIds: [],
				selectedConnectorId: null,
				selectedVertex: null,
				// Close the context menu if it is open
				contextMenuPosition: null,
				// Reset the ObjectMenu expansion
				objectMenuOpenId: null,
				// Reset the multi-select group
				multiSelectGroup: null,
			};
		}

		return nextState;
	},
};
