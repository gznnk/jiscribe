import type React from "react";
import { memo, useCallback, useRef, useState } from "react";

import type {
	DiagramChangeData,
	DiagramChangeEvent,
} from "../../../../types/events/DiagramChangeEvent";
import type { DiagramDragEvent } from "../../../../types/events/DiagramDragEvent";
import type { PathPointState } from "../../../../types/state/shapes/PathPointState";
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
	points: PathPointState[];
	zoom?: number;
	onDiagramChange?: (e: DiagramChangeEvent) => void;
};

/**
 * Midpoint handles component
 */
const MidpointHandlesComponent: React.FC<MidpointHandlesProps> = ({
	id,
	points,
	zoom,
	onDiagramChange,
}) => {
	// Dragging midpoint handle component data.
	const [draggingMidpointHandle, setDraggingMidpointHandle] = useState<
		MidpointHandleData | undefined
	>();

	// Points of owner Path component at the start of the midpoint handle drag.
	const startPoints = useRef<PathPointState[]>([]);

	// Midpoint handle data list for rendering.
	const midpointHandleList: MidpointHandleData[] = [];
	if (draggingMidpointHandle) {
		// During dragging, render only that midpoint handle
		midpointHandleList.push(draggingMidpointHandle);
	} else {
		// When not dragging, render midpoint handles at the midpoint of each vertex pair
		for (let i = 0; i < points.length - 1; i++) {
			const point = points[i];
			const nextPoint = points[i + 1];

			const x = (point.x + nextPoint.x) / 2;
			const y = (point.y + nextPoint.y) / 2;

			midpointHandleList.push({
				id: `${point.id}-${nextPoint.id}`, // Generate ID from adjacent vertices
				x,
				y,
			});
		}
	}

	// Use ref to hold referenced values to avoid frequent handler generation
	const refBusVal = {
		// Properties
		id,
		points,
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
		const { id, points, onDiagramChange, midpointHandleList } = refBus.current;
		// Processing at drag start
		if (e.eventPhase === "Started") {
			// Store the points of owner Path component at the start of the midpoint handle drag.
			startPoints.current = points;

			// Set the midpoint handle being dragged
			setDraggingMidpointHandle({
				id: e.id,
				x: e.startX,
				y: e.startY,
				isTransparent: true,
			});

			// Add a vertex at the same position as the midpoint handle and update the path
			const idx = midpointHandleList.findIndex((v) => v.id === e.id);
			const newPoints = [...points];
			const newPoint = {
				id: e.id,
				type: "PathPoint",
				geometryType: "point",
				x: e.startX,
				y: e.startY,
			} as PathPointState;
			newPoints.splice(idx + 1, 0, newPoint);

			// Notify path change
			onDiagramChange?.({
				eventId: e.eventId,
				eventPhase: e.eventPhase,
				id,
				startDiagram: {
					points: startPoints.current,
				} as DiagramChangeData,
				endDiagram: {
					points: newPoints,
				} as DiagramChangeData,
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
					points: startPoints.current,
				} as DiagramChangeData,
				endDiagram: {
					points: points.map((point) =>
						point.id === e.id ? { ...point, x: e.endX, y: e.endY } : point,
					),
				} as DiagramChangeData,
				minX: e.minX,
				minY: e.minY,
			});
		}

		// Processing at drag completion
		if (e.eventPhase === "Ended") {
			// Clear the midpoint handle being dragged
			setDraggingMidpointHandle(undefined);

			// Update points with new vertex
			const updatedPoints = points.map((point) =>
				point.id === e.id
					? {
							...point,
							id: newId(), // When drag is completed, change from midpoint handle ID to new ID
							x: e.endX,
							y: e.endY,
						}
					: point,
			);

			// Notify path data change due to midpoint handle drag completion
			onDiagramChange?.({
				eventId: e.eventId,
				eventPhase: e.eventPhase,
				id,
				startDiagram: {
					points: startPoints.current,
				} as DiagramChangeData,
				endDiagram: {
					points: updatedPoints,
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
