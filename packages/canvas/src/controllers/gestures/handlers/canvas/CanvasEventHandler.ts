import { roundToDecimal } from "@workspace/geometry";

import { calcPannedViewport } from "./utils/calcPannedViewport";
import { collectIdsInArea } from "./utils/collectIdsInArea";
import { PRECISION } from "../../../../constants/precision";
import { ZOOM } from "../../../../constants/zoom";
import { createObjectDocFromBounds } from "../../../../schemas/objects/utils/createObjectDocFromBounds";
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
 * context menu. On touch, a one-finger background drag pans as well (area
 * selection stays mouse-only for now).
 */
export const CanvasEventHandler: GestureHandler = {
	supports(event): boolean {
		return (
			event.targetKind === "canvas" ||
			event.button === 1 ||
			event.button === 2 ||
			// Like right-button events, a long press is canvas-level wherever it
			// lands (per-target handlers reject it via isPerTargetInteraction)
			event.type === "longPress"
		);
	},

	handle(state, event, registries) {
		// Zoom handling
		// Handle before commitTextEditIfNeeded so zooming does not interrupt an active text edit.
		if (event.type === "zoom" && event.zoomScale != null) {
			const newZoom = Math.max(
				ZOOM.MIN,
				Math.min(ZOOM.MAX, state.viewport.zoom * event.zoomScale),
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

		// Scroll handling (wheel scroll + edge scroll + the glide after a released pan)
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

		// Commit text editing if active. On touch this waits for the tap to resolve
		// (the click branch below): a background touch may become a pan or a pinch,
		// and viewport navigation must not destroy an active edit the way it doesn't
		// for wheel scroll. The draw-mode branch re-runs the commit for its touch
		// drags (starting to draw is a real edit-ending interaction).
		const isTouch = event.pointerType === "touch";
		let nextState = isTouch ? state : commitTextEditIfNeeded(state);

		// Touch long press: open the context menu, mirroring the right-button click.
		// The recognizer ends the gesture (the lift fires no click), so the touch
		// tap-deferral does not apply — commit any active edit now, like the mouse
		// path does.
		if (event.type === "longPress") {
			return {
				...commitTextEditIfNeeded(nextState),
				contextMenuPosition: {
					clientX: event.clientLast.x,
					clientY: event.clientLast.y,
				},
				// A new context menu supersedes any open ObjectMenu / category flyout.
				objectMenuOpenId: null,
				stencilLibraryOpenCategory: null,
			};
		}

		// Middle-/right-button drag for viewport panning (GrabScroll).
		// Middle button (1) pans only; right button (2) also opens the context
		// menu on click. (#159) Releasing either mid-motion leaves a glide behind,
		// which arrives here as inertialScroll-derived scroll events.
		if (event.button === 1 || event.button === 2) {
			if (event.button === 2 && event.type === "click") {
				nextState = {
					...nextState,
					contextMenuPosition: {
						clientX: event.clientLast.x,
						clientY: event.clientLast.y,
					},
					// A new context menu supersedes any open ObjectMenu / category flyout.
					objectMenuOpenId: null,
					stencilLibraryOpenCategory: null,
				};
			}

			if (event.type === "drag") {
				nextState = {
					...nextState,
					viewport: calcPannedViewport(
						state.eventStartSnapshot?.viewport ?? state.viewport,
						event.clientDelta,
					),
				};
			}
			return nextState;
		}

		// Left-button drag in draw mode: only shapes that support bounds drawing
		const shapeDrawing = nextState.shapeDrawing;
		const drawingObjectType =
			shapeDrawing !== null &&
			registries.objectFactory.supportsBoundsDrawing(
				shapeDrawing.preset.objectType,
			)
				? shapeDrawing.preset.objectType
				: null;
		if (
			event.button === 0 &&
			shapeDrawing !== null &&
			drawingObjectType !== null
		) {
			// No-op for mouse (already committed above); commits for touch draws.
			nextState = commitTextEditIfNeeded(nextState);

			// Starting to draw dismisses an open ObjectMenu / category flyout.
			if (
				nextState.objectMenuOpenId !== null ||
				nextState.stencilLibraryOpenCategory !== null
			) {
				nextState = {
					...nextState,
					objectMenuOpenId: null,
					stencilLibraryOpenCategory: null,
				};
			}

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
					registries.objectFactory,
					nextState.shapeDrawing.preset.defaultOverrides,
					undefined,
					nextState.docDefaults,
				);

				if (doc) {
					const objectState = registries.objectMapper.toState(doc);
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

		// Touch: a one-finger drag on the canvas background pans instead of
		// area-selecting (area selection is unavailable on touch for now; a
		// multi-select alternative is a separate task). Scoped to drag events so a
		// background tap still deselects via the click branch below.
		if (
			isTouch &&
			event.button === 0 &&
			(event.type === "dragStart" ||
				event.type === "drag" ||
				event.type === "dragEnd")
		) {
			// dragStart pans too: it already carries a threshold-sized clientDelta,
			// and a slow touch stream may deliver only dragStart in a frame.
			if (event.type === "dragStart" || event.type === "drag") {
				nextState = {
					...nextState,
					viewport: calcPannedViewport(
						state.eventStartSnapshot?.viewport ?? state.viewport,
						event.clientDelta,
					),
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
						hitIds: [],
					},
					selectedIds: [],
					selectedConnectorId: null,
					selectedVertex: null,
					// Cleared here too (not only on "pressed"): the early-out below keeps the
					// previous multiSelectGroup as-is while the hit set stays empty.
					multiSelectGroup: null,
					edgeScrollEnabled: true,
					objectMenuOpenId: null,
					stencilLibraryOpenCategory: null,
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

				// Same hit set as the previous frame: keep selectedIds / multiSelectGroup
				// as-is and skip group folding and multiSelectGroup rebuilding (#219).
				// Element order is stable because collectIdsInArea scans the same bboxes map.
				const areSameIds =
					hitIds.length === area.hitIds.length &&
					hitIds.every((id, i) => id === area.hitIds[i]);
				if (areSameIds) {
					nextState = {
						...nextState,
						areaSelection: { ...area, endX, endY },
					};
					return nextState;
				}

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
					areaSelection: { ...area, endX, endY, hitIds },
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

		// Clear selection and close menus on a left press — on touch, only once the
		// tap resolves (click). A pan or pinch must not clear the selection, the open
		// menus, or an active edit; pinch suppresses click, so two-finger gestures
		// preserve them automatically.
		if (event.button === 0 && event.type === (isTouch ? "click" : "pressed")) {
			if (isTouch) {
				// The deferred commit from the top of handle()
				nextState = commitTextEditIfNeeded(nextState);
			}
			nextState = {
				...nextState,
				selectedIds: [],
				selectedConnectorId: null,
				selectedVertex: null,
				// Close the context menu if it is open
				contextMenuPosition: null,
				// Reset the ObjectMenu expansion
				objectMenuOpenId: null,
				stencilLibraryOpenCategory: null,
				// Reset the multi-select group
				multiSelectGroup: null,
			};
		}

		return nextState;
	},
};
