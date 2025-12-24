import { calcOrientedFrameFromPoints } from "@workspace/geometry";
import type React from "react";
import { memo, useCallback, useRef, useState } from "react";

import type {
	DiagramChangeData,
	DiagramChangeEvent,
} from "../../../../types/events/DiagramChangeEvent";
import type { DiagramDragEvent } from "../../../../types/events/DiagramDragEvent";
import type { Diagram } from "../../../../types/state/core/Diagram";
import type { PathState } from "../../../../types/state/shapes/PathState";
import { newId } from "../../../../utils/shapes/common/newId";
import { DragPoint } from "../../../core/DragPoint";

/**
 * Midpoint handle data
 */
type MidpointHandleData = {
	id: string;
	x: number;
	y: number;
	isTransparent?: boolean;
};

/**
 * Midpoint handles properties
 */
type MidpointHandlesProps = {
	id: string;
	rotation: number;
	scaleX: number;
	scaleY: number;
	items: Diagram[];
	zoom?: number;
	onDiagramChange?: (e: DiagramChangeEvent) => void;
};

/**
 * Midpoint handles component
 */
const MidpointHandlesComponent: React.FC<MidpointHandlesProps> = ({
	id,
	rotation,
	scaleX,
	scaleY,
	items,
	zoom,
	onDiagramChange,
}) => {
	// Dragging midpoint handle component data.
	const [draggingMidpointHandle, setDraggingMidpointHandle] = useState<
		MidpointHandleData | undefined
	>();

	// Items of owner Path component at the start of the midpoint handle drag.
	const startItems = useRef<Diagram[]>(items);

	// Midpoint handle data list for rendering.
	const midpointHandleList: MidpointHandleData[] = [];
	if (draggingMidpointHandle) {
		// During dragging, render only that midpoint handle
		midpointHandleList.push(draggingMidpointHandle);
	} else {
		// When not dragging, render midpoint handles at the midpoint of each vertex pair
		for (let i = 0; i < items.length - 1; i++) {
			const item = items[i];
			const nextItem = items[i + 1];

			const x = (item.x + nextItem.x) / 2;
			const y = (item.y + nextItem.y) / 2;

			midpointHandleList.push({
				id: `${item.id}-${nextItem.id}`, // Generate ID from adjacent vertices
				x,
				y,
			});
		}
	}

	// Use ref to hold referenced values to avoid frequent handler generation
	const refBusVal = {
		// Properties
		id,
		rotation,
		scaleX,
		scaleY,
		items,
		onDiagramChange,
		// State variables and functions
		midpointHandleList,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	/**
	 * Midpoint handle drag event handler
	 */
	const handleMidpointHandleDrag = useCallback((e: DiagramDragEvent) => {
		const {
			id,
			rotation,
			scaleX,
			scaleY,
			items,
			onDiagramChange,
			midpointHandleList,
		} = refBus.current;
		// Processing at drag start
		if (e.eventPhase === "Started") {
			// Store the items of owner Path component at the start of the midpoint handle drag.
			startItems.current = items;

			// Set the midpoint handle being dragged
			setDraggingMidpointHandle({
				id: e.id,
				x: e.startX,
				y: e.startY,
				isTransparent: true,
			});

			// Add a vertex at the same position as the midpoint handle and update the path
			const idx = midpointHandleList.findIndex((v) => v.id === e.id);
			const newItems = [...items];
			const newItem = {
				id: e.id,
				type: "PathPoint",
				x: e.startX,
				y: e.startY,
			} as Diagram;
			newItems.splice(idx + 1, 0, newItem);

			// Notify path change
			onDiagramChange?.({
				eventId: e.eventId,
				eventPhase: e.eventPhase,
				id,
				startDiagram: {
					items: startItems.current,
				} as PathState,
				endDiagram: {
					items: newItems,
				} as PathState,
				minX: e.minX,
				minY: e.minY,
			});
		}

		// Processing during drag
		if (e.eventPhase === "InProgress") {
			// Update the position of the midpoint handle being dragged
			setDraggingMidpointHandle({
				id: e.id,
				x: e.endX,
				y: e.endY,
				isTransparent: true,
			});

			// Notify path vertex position change due to midpoint handle drag
			onDiagramChange?.({
				eventId: e.eventId,
				eventPhase: e.eventPhase,
				id,
				startDiagram: {
					items: startItems.current,
				} as PathState,
				endDiagram: {
					items: items.map((item) =>
						item.id === e.id ? { ...item, x: e.endX, y: e.endY } : item,
					),
				} as PathState,
				minX: e.minX,
				minY: e.minY,
			});
		}

		// Processing at drag completion
		if (e.eventPhase === "Ended") {
			// Clear the midpoint handle being dragged
			setDraggingMidpointHandle(undefined);

			// Update items with new vertex
			const updatedItems = items.map((item) =>
				item.id === e.id
					? {
							...item,
							id: newId(), // When drag is completed, change from midpoint handle ID to new ID
							x: e.endX,
							y: e.endY,
						}
					: item,
			);

			// Calculate new bounding box from updated points
			const newFrame = calcOrientedFrameFromPoints(
				updatedItems.map((p) => ({ x: p.x, y: p.y })),
				rotation,
				scaleX,
				scaleY,
			);

			// Notify path data change due to midpoint handle drag completion
			onDiagramChange?.({
				eventId: e.eventId,
				eventPhase: e.eventPhase,
				id,
				startDiagram: {
					items: startItems.current,
				} as PathState,
				endDiagram: {
					items: updatedItems,
					x: newFrame.x,
					y: newFrame.y,
					width: newFrame.width,
					height: newFrame.height,
				} as DiagramChangeData,
				minX: e.minX,
				minY: e.minY,
			});
		}
	}, []);

	return midpointHandleList.map((item) => (
		<DragPoint
			key={item.id}
			id={item.id}
			x={item.x}
			y={item.y}
			fill="white"
			isTransparent={item.isTransparent}
			zoom={zoom}
			onDrag={handleMidpointHandleDrag}
		/>
	));
};

export const MidpointHandles = memo(MidpointHandlesComponent);
