import { useCallback, useRef } from "react";

import type { DiagramPathIndex } from "../../../types/core/DiagramPath";
import type { PreviewConnectLineEvent } from "../../../types/events/PreviewConnectLineEvent";
import { isConnectableState } from "../../../utils/validation/isConnectableState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { clearSelectionRecursively } from "../../utils/clearSelectionRecursively";
import { createDiagramPathIndex } from "../../utils/createDiagramPathIndex";
import { updateDiagramsByPath } from "../../utils/updateDiagramsByPath";

/**
 * Custom hook to handle preview connect line events on the canvas.
 * Updates the canvas state to show or hide the preview connection line.
 */
export const usePreviewConnectLine = (props: SvgCanvasSubHooksProps) => {
	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	// Reference to store path index for efficient updates
	const pathIndex = useRef<DiagramPathIndex>(new Map());

	return useCallback((e: PreviewConnectLineEvent) => {
		// Bypass references to avoid function creation in every render.
		const { setCanvasState } = refBus.current.props;

		setCanvasState((prevState) => {
			// Clear all selections and create path index when connection preview starts
			let baseItems = prevState.items;

			if (e.eventPhase === "Started") {
				// Clear all selections
				baseItems = clearSelectionRecursively(prevState.items);
				// Create path index for the owner diagram
				pathIndex.current = createDiagramPathIndex(
					prevState.items,
					new Set([e.ownerId]),
				);
			}

			// Update connect point position using path-based update
			const updatedItems = updateDiagramsByPath(
				baseItems,
				pathIndex.current,
				(item) => {
					if (isConnectableState(item)) {
						return {
							...item,
							connectPoints: item.connectPoints.map((cp) =>
								cp.id === e.id ? { ...cp, x: e.x, y: e.y } : cp,
							),
						};
					}
					return item;
				},
			);

			const newState = {
				...prevState,
				items: updatedItems,
				previewConnectLineState: e.pathData,
				multiSelectGroup: undefined,
			};

			// Update minX and minY if provided (for auto canvas expansion)
			if (e.minX !== undefined && e.minY !== undefined) {
				newState.minX = e.minX;
				newState.minY = e.minY;
			}

			// Clean up path index when connection preview ends
			if (e.eventPhase === "Ended") {
				pathIndex.current.clear();
			}

			return newState;
		});
	}, []);
};
