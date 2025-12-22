import { useCallback, useRef } from "react";

import type { DiagramDragDropEvent } from "../../../types/events/DiagramDragDropEvent";
import type { Diagram } from "../../../types/state/core/Diagram";
import { isConnectableState } from "../../../utils/validation/isConnectableState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { applyFunctionRecursively } from "../../utils/applyFunctionRecursively";

/**
 * Custom hook to handle drag over events on the canvas.
 * This hook provides a centralized way to handle drag over state
 * for diagram elements, enabling visual feedback during drag operations.
 */
export const useOnDragOver = (props: SvgCanvasSubHooksProps) => {
	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	return useCallback((e: DiagramDragDropEvent) => {
		// Bypass references to avoid function creation in every render.
		const { setCanvasState } = refBus.current.props;

		setCanvasState((prevState) => {
			let items = prevState.items;

			if (e.dropItem.type === "ConnectPoint") {
				// Only show connect points if dragging a ConnectPoint
				items = applyFunctionRecursively(prevState.items, (item: Diagram) => {
					// Check if this item can have connect points
					if (item.id === e.dropTargetItem.id && isConnectableState(item)) {
						// Show connect points when ConnectPoint is being dragged over
						return {
							...item,
							showConnectPoints: true,
						};
					}
					return item;
				});
			}

			return {
				...prevState,
				items,
				showDragGhost:
					e.showGhost !== undefined ? e.showGhost : prevState.showDragGhost,
			};
		});
	}, []);
};
