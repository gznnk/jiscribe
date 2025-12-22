import { useCallback, useRef } from "react";

import { useAddDiagram } from "./useAddDiagram";
import { DiagramRegistry } from "../../../registry";
import type { DiagramType } from "../../../types/core/DiagramType";
import type { AddDiagramByTypeEvent } from "../../../types/events/AddDiagramByTypeEvent";
import type { Diagram } from "../../../types/state/core/Diagram";
import { isSelectableState } from "../../../utils/validation/isSelectableState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";

/**
 * Custom hook to handle new diagram events on the canvas.
 */
export const useAddDiagramByType = (props: SvgCanvasSubHooksProps) => {
	// Create a function to add a new diagram.
	const addDiagram = useAddDiagram(props);

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
		addDiagram,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	return useCallback((e: AddDiagramByTypeEvent) => {
		// Bypass references to avoid function creation in every render.
		const {
			props: { canvasState, canvasRef },
			addDiagram,
		} = refBus.current;

		let x = 0;
		let y = 0;
		if (e.x !== undefined && e.y !== undefined) {
			x = e.x;
			y = e.y;
		} else {
			// Calculate center position considering zoom and actual container dimensions
			const containerElement = canvasRef?.containerRef.current;
			if (containerElement) {
				const containerRect = containerElement.getBoundingClientRect();
				const containerWidth = containerRect.width;
				const containerHeight = containerRect.height;

				// Calculate center position in canvas coordinates
				x = (canvasState.minX + containerWidth / 2) / canvasState.zoom;
				y = (canvasState.minY + containerHeight / 2) / canvasState.zoom;
			} else {
				// Fallback to using window dimensions if container is not available
				x = (canvasState.minX + window.innerWidth / 2) / canvasState.zoom;
				y = (canvasState.minY + window.innerHeight / 2) / canvasState.zoom;
			}
		}

		const diagramType = e.diagramType as DiagramType;

		// Create a new diagram based on the diagram type.
		const createFunction = DiagramRegistry.getCreateFunction(diagramType);
		const data = createFunction?.({
			x,
			y,
		}) as Diagram;

		if (!data) {
			console.warn(`Create function not found for type: ${diagramType}`);
			return;
		}

		// Apply variant overrides if provided
		if (e.variant) {
			Object.assign(data, e.variant);
		}

		if (e.isSelected && isSelectableState(data)) {
			data.isSelected = true;
			data.showOutline = true;
		}

		if (data) {
			addDiagram({
				eventId: e.eventId,
				item: data,
			});
		}
	}, []);
};
