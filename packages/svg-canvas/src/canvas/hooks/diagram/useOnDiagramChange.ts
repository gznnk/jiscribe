import { useCallback, useRef, useEffect } from "react";

import { DIAGRAM_CHANGE_EVENT_NAME } from "../../../constants/core/EventNames";
import type { DiagramChangeEvent } from "../../../types/events/DiagramChangeEvent";
import type { EventPhase } from "../../../types/events/EventPhase";
import { collectDiagramIds } from "../../../utils/core/collectDiagramIds";
import { getDiagramById } from "../../../utils/core/getDiagramById";
import { collectConnectedConnectLines } from "../../../utils/shapes/connectLine/collectConnectedConnectLines";
import { updateConnectLinesByIds } from "../../../utils/shapes/connectLine/updateConnectLinesByIds";
import { InteractionState } from "../../types/InteractionState";
import type { SvgCanvasState } from "../../types/SvgCanvasState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { applyFunctionRecursively } from "../../utils/applyFunctionRecursively";
import { updateDiagramConnectPoints } from "../../utils/updateDiagramConnectPoints";
import { updateOutlineOfAllItemables } from "../../utils/updateOutlineOfAllItemables";
import { useAddHistory } from "../history/useAddHistory";

/**
 * Determines if an item should be in changing state based on event phase.
 * Pure function for consistent state management.
 */
const getIsChangingState = (eventPhase: EventPhase): boolean => {
	return eventPhase === "Started" || eventPhase === "InProgress";
};

/**
 * Custom hook to handle diagram change events on the canvas.
 * Returns a callback function and also listens to DIAGRAM_CHANGE_EVENT_NAME from the event bus.
 */
export const useOnDiagramChange = (props: SvgCanvasSubHooksProps) => {
	const { eventBus, setCanvasState, onPanZoomChange } = props;

	// Get the data change handler.
	const addHistory = useAddHistory(props);

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		eventBus,
		setCanvasState,
		onPanZoomChange,
		addHistory,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	// Reference to store the canvas state at the start of change for connect line updates.
	const startCanvasState = useRef<SvgCanvasState | undefined>(undefined);
	// Reference to store ConnectLine IDs that need to be updated
	const connectedConnectLineIds = useRef<Set<string>>(new Set());

	// Handler function that processes diagram change events
	const handleDiagramChange = useCallback((e: DiagramChangeEvent) => {
		// Bypass references to avoid function creation in every render.
		const { setCanvasState, onPanZoomChange, addHistory } = refBus.current;

		setCanvasState((prevState) => {
			// Store the current canvas state for connect line updates on change start
			if (e.eventPhase === "Started") {
				startCanvasState.current = prevState;

				// Find the diagram being changed
				const changedDiagram = getDiagramById(prevState.items, e.id);

				// Collect all diagram IDs (changed diagram + its descendants)
				const allChangedDiagramIds = changedDiagram
					? collectDiagramIds([changedDiagram])
					: new Set<string>([e.id]);

				// Collect ConnectLine IDs that are connected to the changed diagrams
				const connectLineIds = collectConnectedConnectLines(
					prevState.items,
					allChangedDiagramIds,
				);
				connectedConnectLineIds.current = connectLineIds;
			}
			// Create a new state with the updated items and multi-select group.
			let newState = {
				...prevState,
				items: applyFunctionRecursively(prevState.items, (item) => {
					// If the id does not match, return the original item.
					if (item.id !== e.id) return item;

					// If the id matches, update the item with the new properties.
					let newItem = { ...item, ...e.endDiagram };

					// Update connect points for the changed diagram
					newItem = updateDiagramConnectPoints(newItem);

					// Return the updated item.
					return newItem;
				}),
				interactionState: getIsChangingState(e.eventPhase)
					? InteractionState.Changing
					: InteractionState.Idle,
			};

			newState.items = updateOutlineOfAllItemables(newState.items);

			// If the event has minX and minY, update the canvas state
			if (e.minX !== undefined && e.minY !== undefined) {
				newState.minX = e.minX;
				newState.minY = e.minY;

				onPanZoomChange?.({
					minX: e.minX,
					minY: e.minY,
					zoom: newState.zoom,
				});
			}

			// Update the connect lines using cached ConnectLine IDs
			newState = updateConnectLinesByIds(
				connectedConnectLineIds.current,
				newState,
				startCanvasState.current,
			);

			if (e.eventPhase === "Ended") {
				// Add history
				newState = addHistory(e.eventId, newState);

				// Clean up the canvas state reference
				startCanvasState.current = undefined;
				connectedConnectLineIds.current.clear();
			}

			return newState;
		});
	}, []);

	// Listen to diagram change events from the event bus
	useEffect(() => {
		const { eventBus } = refBus.current;

		const handleEvent = (event: Event) => {
			const customEvent = event as CustomEvent<DiagramChangeEvent>;
			handleDiagramChange(customEvent.detail);
		};

		eventBus.addEventListener(DIAGRAM_CHANGE_EVENT_NAME, handleEvent);

		return () => {
			eventBus.removeEventListener(DIAGRAM_CHANGE_EVENT_NAME, handleEvent);
		};
	}, [handleDiagramChange]);

	// Return the callback function for direct usage
	return handleDiagramChange;
};
