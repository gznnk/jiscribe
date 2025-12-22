import { useCallback, useRef } from "react";

import type { AiMessageChangeEvent } from "../../../types/events/AiMessageChangeEvent";
import type { AiState } from "../../../types/state/diagrams/AiState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { useAddHistory } from "../history/useAddHistory";

/**
 * Custom hook to handle AI message change events on the canvas.
 */
export const useOnAiMessageChange = (props: SvgCanvasSubHooksProps) => {
	const { canvasState, setCanvasState } = props;
	const addHistory = useAddHistory(props);

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		canvasState,
		setCanvasState,
		addHistory,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	return useCallback((e: AiMessageChangeEvent) => {
		// Bypass references to avoid function creation in every render.
		const { canvasState, setCanvasState, addHistory } = refBus.current;

		// Find the Ai diagram by ID
		const diagram = canvasState.items.find((item) => item.id === e.id);
		if (!diagram || diagram.type !== "Ai") return;

		const aiDiagram = diagram as AiState;

		// Update the aiMessage
		const updatedDiagram: AiState = {
			...aiDiagram,
			aiMessage: e.aiMessage,
		};

		// Update the canvas state
		const updatedItems = canvasState.items.map((item) =>
			item.id === e.id ? updatedDiagram : item,
		);

		const newState = {
			...canvasState,
			items: updatedItems,
		};

		const newStateWithHistory = addHistory(e.eventId, newState);
		setCanvasState(newStateWithHistory);
	}, []);
};
