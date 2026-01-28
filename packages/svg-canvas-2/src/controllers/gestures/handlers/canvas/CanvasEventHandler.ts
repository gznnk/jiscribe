import type {
	CanvasEvent,
	GestureHandler,
} from "../../../../registry/GestureHandlerRegistryTypes";
import type { CanvasState } from "../../../../states/canvas/CanvasState";

/**
 * Handles events that occur on the canvas (not on objects).
 * This is the main entry point for canvas-level event handling.
 */
export const CanvasEventHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return event.targetKind === "canvas";
	},

	handle(state: CanvasState, event: CanvasEvent): CanvasState {
		let nextState = state;

		// Zoom handling
		if (event.type === "zoom" && event.scrollDelta) {
			const { deltaY } = event.scrollDelta;
			const zoomDelta = deltaY > 0 ? 0.9 : 1.1;
			const newZoom = state.viewport.zoom * zoomDelta;
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
					zoom: newZoom,
					minX: newMinX,
					minY: newMinY,
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
					minX: state.viewport.minX + svgDeltaX,
					minY: state.viewport.minY + svgDeltaY,
				},
			};
			return nextState;
		}

		// Right-click drag for viewport panning (GrabScroll)
		if (event.button === 2) {
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
						minX: initialViewport.minX - deltaX,
						minY: initialViewport.minY - deltaY,
					},
				};
			}
			return nextState;
		}

		// Clear selection on click (left-click only)
		if (event.type === "click" && event.button === 0) {
			nextState = {
				...nextState,
				selectedIds: [],
			};
		}

		return nextState;
	},
};
