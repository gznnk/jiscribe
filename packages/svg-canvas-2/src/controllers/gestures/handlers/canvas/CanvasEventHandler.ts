import { roundToDecimal } from "@workspace/geometry";

import { collectIdsInArea } from "./utils/collectIdsInArea";
import { PRECISION } from "../../../../constants/precision";
import { ZOOM } from "../../../../constants/zoom";
import { autoSelectParentGroups } from "../../../../operations/objects/utils/autoSelectParentGroups";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../../../registry/GestureHandlerRegistryTypes";
import type { CanvasState } from "../../../../states/canvas/CanvasState";

/**
 * Handles events that occur on the canvas.
 * Right-click interactions are also treated as canvas-level behavior so
 * grab-scroll and context menus work consistently above objects and controls.
 */
export const CanvasEventHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return event.targetKind === "canvas" || event.button === 2;
	},

	handle(state: CanvasState, event: CanvasEvent): CanvasState {
		let nextState = state;

		// Zoom handling
		if (event.type === "zoom" && event.scrollDelta) {
			// TODO: scrollDeltaというプロパティを再利用するのは少し違和感がある。将来的にはGestureにzoomDeltaを直接持たせるか、別のプロパティにすることを検討。
			const { deltaY } = event.scrollDelta;
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

			nextState = {
				...nextState,
				viewport: {
					...state.viewport,
					zoom: roundToDecimal(newZoom, PRECISION.ZOOM),
					minX: roundToDecimal(newMinX, PRECISION.COORDINATE),
					minY: roundToDecimal(newMinY, PRECISION.COORDINATE),
				},
			};
			return nextState;
		}

		// Scroll handling (wheel scroll + edge scroll)
		if (event.type === "scroll" && event.scrollDelta) {
			const { deltaX, deltaY } = event.scrollDelta;
			const svgDeltaX = deltaX / state.viewport.zoom;
			const svgDeltaY = deltaY / state.viewport.zoom;

			nextState = {
				...nextState,
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
			return nextState;
		}

		// Right-click drag for viewport panning (GrabScroll)
		if (event.button === 2) {
			if (event.type === "click") {
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
					state.eventStartState?.viewport ?? state.viewport;
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
					edgeScrollEnabled: true,
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

				const hitIds = collectIdsInArea(
					nextState.objects,
					areaMinX,
					areaMinY,
					areaMaxX,
					areaMaxY,
				);

				const selectedIds = autoSelectParentGroups(nextState, hitIds);

				nextState = {
					...nextState,
					areaSelection: { ...area, endX, endY },
					selectedIds,
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

		// Clear selection on click (left-click only)
		if (event.type === "click" && event.button === 0) {
			nextState = {
				...nextState,
				selectedIds: [],
				// コンテキストメニューが開いている場合は閉じる
				contextMenuPosition: null,
			};
		}

		return nextState;
	},
};
