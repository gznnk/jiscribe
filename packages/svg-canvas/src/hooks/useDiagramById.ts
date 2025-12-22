import { useSvgCanvasState } from "../context/SvgCanvasStateContext";
import type { Diagram } from "../types/state/core/Diagram";
import { getDiagramById } from "../utils/core/getDiagramById";

/**
 * Hook to get a diagram by its ID from the canvas state.
 *
 * @param diagramId - The ID of the diagram to find
 * @returns The diagram with the specified ID, or undefined if not found
 */
export const useDiagramById = (diagramId: string | undefined): Diagram | undefined => {
	const canvasStateRef = useSvgCanvasState();
	const allDiagrams = canvasStateRef.current?.items || [];

	if (!diagramId) {
		return undefined;
	}

	return getDiagramById(allDiagrams, diagramId);
};