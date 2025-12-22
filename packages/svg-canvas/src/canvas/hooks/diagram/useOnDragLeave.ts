import { useCallback, useRef } from "react";

import type { DiagramDragDropEvent } from "../../../types/events/DiagramDragDropEvent";
import type { Diagram } from "../../../types/state/core/Diagram";
import { isConnectableState } from "../../../utils/validation/isConnectableState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { applyFunctionRecursively } from "../../utils/applyFunctionRecursively";

/**
 * Custom hook to handle drag leave events on the canvas.
 * This hook provides a centralized way to handle drag leave state
 * for diagram elements, enabling visual feedback during drag operations.
 */
export const useOnDragLeave = (props: SvgCanvasSubHooksProps) => {
	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	return useCallback((e: DiagramDragDropEvent) => {
		// Bypass references to avoid function creation in every render.
		const { setCanvasState } = refBus.current.props;

		// Update canvas state to hide connect points when drag leaves an element
		setCanvasState((prevState) => {
			// Update items to hide connect points for connectable elements
			const items = applyFunctionRecursively(
				prevState.items,
				(item: Diagram) => {
					// Check if this item can have connect points
					if (item.id === e.dropTargetItem.id && isConnectableState(item)) {
						// Hide connect points
						return {
							...item,
							showConnectPoints: false,
						};
					}
					return item;
				},
			);

			return {
				...prevState,
				items,
				showDragGhost:
					e.showGhost !== undefined ? e.showGhost : prevState.showDragGhost,
			};
		});
	}, []);
};
