import { useCallback, useRef } from "react";

import type { DiagramDragEvent } from "../../../types/events/DiagramDragEvent";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { GroupState } from "../../../types/state/shapes/GroupState";
import { applyPointToDiagram } from "../../../utils/core/applyPointToDiagram";
import { convertDiagramToPoint } from "../../../utils/core/convertDiagramToPoint";
import { collectConnectedConnectLines } from "../../../utils/shapes/connectLine/collectConnectedConnectLines";
import { updateConnectLinesByIds } from "../../../utils/shapes/connectLine/updateConnectLinesByIds";
import { isItemableState } from "../../../utils/validation/isItemableState";
import { isOriginableState } from "../../../utils/validation/isOriginableState";
import { InteractionState } from "../../types/InteractionState";
import type { SvgCanvasState } from "../../types/SvgCanvasState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { createItemMap } from "../../utils/createItemMap";
import { getAncestorItemsById } from "../../utils/getAncestorItemsById";
import { updateDiagramConnectPoints } from "../../utils/updateDiagramConnectPoints";
import { updateDiagramsByPath } from "../../utils/updateDiagramsByPath";
import { updateOutlineOfAllItemables } from "../../utils/updateOutlineOfAllItemables";
import { useAddHistory } from "../history/useAddHistory";

/**
 * Custom hook to handle drag events on the canvas.
 */
export const useOnDrag = (props: SvgCanvasSubHooksProps) => {
	// Get the data change handler.
	const addHistory = useAddHistory(props);

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
		addHistory,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	// Reference to store the canvas state at the start of drag for connect line updates.
	const startCanvasState = useRef<SvgCanvasState | undefined>(undefined);
	// Reference to store initial items at the start of drag.
	const initialItemsMap = useRef<Map<string, Diagram>>(new Map());
	// Reference to store initial multi select group
	const initialMultiSelectGroup = useRef<GroupState | undefined>(undefined);
	// Reference to store diagram IDs of the drag-triggering diagram and its ancestors
	const dragTriggeredTreeIds = useRef<Set<string>>(new Set());
	// Reference to store ConnectLine IDs that need to be updated
	const connectedConnectLineIds = useRef<Set<string>>(new Set());

	// Return a callback function to handle the drag event.
	return useCallback((e: DiagramDragEvent) => {
		// Bypass references to avoid function creation in every render.
		const {
			props: {
				setCanvasState,
				onPanZoomChange,
				canvasState: { selectedDiagramPathIndex },
			},
			addHistory,
		} = refBus.current;

		// Update the canvas state based on the drag event.
		setCanvasState((prevState) => {
			// Store the current canvas state for connect line updates on drag start
			if (e.eventPhase === "Started") {
				startCanvasState.current = prevState;

				// Store initial items map
				initialItemsMap.current = createItemMap(prevState.items);

				// Store initial multi select group
				if (prevState.multiSelectGroup) {
					initialMultiSelectGroup.current = prevState.multiSelectGroup;
				}

				// Collect all diagram IDs that are part of the drag operation
				dragTriggeredTreeIds.current = new Set([
					...getAncestorItemsById(e.id, prevState.items).map((d) => d.id),
					e.id,
				]);

				// Collect all diagram IDs that will be moved (selected + their descendants)
				const allMovedDiagramIds = new Set(selectedDiagramPathIndex.keys());

				// Collect ConnectLine IDs that are connected to any of the moved diagrams
				const connectLineIds = collectConnectedConnectLines(
					prevState.items,
					allMovedDiagramIds,
				);
				connectedConnectLineIds.current = connectLineIds;
			}

			// Calculate the movement delta
			const dx = e.endX - e.startX;
			const dy = e.endY - e.startY;

			// Check if currently dragging
			const isDragging =
				e.eventPhase === "Started" || e.eventPhase === "InProgress";

			// Get initial items from ref (stored at drag start)
			const initialItems = initialItemsMap.current;

			// Recursively update diagram and all its descendants
			const updateDiagramRecursively = (diagram: Diagram): Diagram => {
				const initialItem = initialItems.get(diagram.id);
				if (!initialItem) {
					return diagram;
				}

				const initialPoint = convertDiagramToPoint(initialItem);
				if (!initialPoint) {
					return diagram;
				}

				// Update position and dragging state
				let newItem = {
					...applyPointToDiagram(
						{
							x: initialPoint.x + dx,
							y: initialPoint.y + dy,
						},
						diagram,
					),
					isDragging,
					isInDragTriggeredTree:
						isDragging && dragTriggeredTreeIds.current.has(diagram.id),
				} as Diagram;

				// Update connect points
				newItem = updateDiagramConnectPoints(newItem);

				// Update origin for diagrams with origin properties
				if (isOriginableState(newItem) && isOriginableState(initialItem)) {
					// Update origin by adding dx/dy to initial origin
					newItem = {
						...newItem,
						originX: initialItem.originX + dx,
						originY: initialItem.originY + dy,
					} as Diagram;
				}

				// Recursively update children if this diagram has them
				if (isItemableState(newItem)) {
					newItem = {
						...newItem,
						items: newItem.items.map(updateDiagramRecursively),
					} as Diagram;
				}

				return newItem;
			};

			// Create the new state using path-based updates (only for selected diagrams, children updated recursively)
			let newState: SvgCanvasState = {
				...prevState,
				items: updateDiagramsByPath(
					prevState.items,
					selectedDiagramPathIndex,
					updateDiagramRecursively,
				),
				interactionState: isDragging
					? InteractionState.Dragging
					: InteractionState.Idle,
			};

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

			// If multiple items are selected, create a multi-select group
			if (prevState.multiSelectGroup && initialMultiSelectGroup.current) {
				newState.multiSelectGroup = {
					...prevState.multiSelectGroup,
					x: initialMultiSelectGroup.current.x + dx,
					y: initialMultiSelectGroup.current.y + dy,
				};
			}

			// Refresh the connect lines using cached ConnectLine IDs
			newState = updateConnectLinesByIds(
				connectedConnectLineIds.current,
				newState,
				startCanvasState.current,
			);

			// If the drag event is ended
			if (e.eventPhase === "Ended") {
				// Update outline of all groups.
				newState.items = updateOutlineOfAllItemables(newState.items);

				// Hide drag ghost when drag ends
				newState.showDragGhost = false;

				// Add history and get updated state
				newState = addHistory(e.eventId, newState);

				// Clean up references
				startCanvasState.current = undefined;
				initialItemsMap.current.clear();
				initialMultiSelectGroup.current = undefined;
				dragTriggeredTreeIds.current.clear();
				connectedConnectLineIds.current.clear();
			}

			return newState;
		});
	}, []);
};
