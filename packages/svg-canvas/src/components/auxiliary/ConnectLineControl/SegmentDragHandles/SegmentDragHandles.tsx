import type React from "react";
import { memo, useCallback, useRef, useState } from "react";

import type {
	DiagramChangeData,
	DiagramChangeEvent,
} from "../../../../types/events/DiagramChangeEvent";
import type { DiagramClickEvent } from "../../../../types/events/DiagramClickEvent";
import type { DiagramDragEvent } from "../../../../types/events/DiagramDragEvent";
import type { DiagramPointerEvent } from "../../../../types/events/DiagramPointerEvent";
import type { PathPointState } from "../../../../types/state/shapes/PathPointState";
import type { PathState } from "../../../../types/state/shapes/PathState";
import { newId } from "../../../../utils/shapes/common/newId";
import {
	SegmentDragHandle,
	type SegmentDragHandleData,
} from "../SegmentDragHandle";

/**
 * SegmentDragHandles properties
 */
type SegmentDragHandlesProps = {
	id: string;
	perpendicularDrag: boolean;
	preserveEndpoints: boolean;
	points: PathPointState[];
	zoom?: number;
	onPointerDown?: (e: DiagramPointerEvent) => void;
	onClick?: (e: DiagramClickEvent) => void;
	onDiagramChange?: (e: DiagramChangeEvent) => void;
};

/**
 * SegmentDragHandles component
 */
const SegmentDragHandlesComponent: React.FC<SegmentDragHandlesProps> = ({
	id,
	perpendicularDrag,
	preserveEndpoints,
	points,
	zoom,
	onClick,
	onDiagramChange,
}) => {
	// State to manage the segment being dragged.
	const [draggingSegment, setDraggingSegment] = useState<
		SegmentDragHandleData | undefined
	>();
	// Reference to store the segment being dragged at the start of the drag.
	const startSegment = useRef<SegmentDragHandleData>(undefined);

	// Points of owner Path component at the start of the segment drag.
	const startPoints = useRef<PathPointState[]>(points);

	// Build segment list: all segments normally, only dragged segment during drag operation.
	const segmentList: SegmentDragHandleData[] = [];
	if (draggingSegment) {
		segmentList.push(draggingSegment);
	} else {
		for (let i = 0; i < points.length - 1; i++) {
			const point = points[i];
			const nextPoint = points[i + 1];

			segmentList.push({
				id: `${point.id}-${nextPoint.id}`,
				startX: point.x,
				startY: point.y,
				startPointId: point.id,
				endX: nextPoint.x,
				endY: nextPoint.y,
				endPointId: nextPoint.id,
			});
		}
	}

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		// Component properties
		id,
		points,
		preserveEndpoints,
		onDiagramChange,
		// Internal variables and functions
		draggingSegment,
		segmentList,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	/**
	 * Handle segment drag event.
	 */
	const handleSegmentDrag = useCallback((e: DiagramDragEvent) => {
		// Bypass references to avoid function creation in every render.
		const {
			id,
			preserveEndpoints,
			points,
			onDiagramChange,
			draggingSegment,
			segmentList,
		} = refBus.current;

		// Process the drag start event.
		if (e.eventPhase === "Started") {
			// Store the points at the start of the segment drag.
			startPoints.current = points;

			// Find the index of the segment being dragged.
			const idx = segmentList.findIndex((v) => v.id === e.id);

			// Store segment data at the start of the segment drag.
			const segment = segmentList[idx];
			startSegment.current = segment;

			// Prepare a new segment data.
			const newSegment = {
				...segment,
			};

			let updatedPoints = points;

			// If endpoints are preserved, add a new vertex when moving end segments.
			const isBothEndsIdx = idx === 0 || idx === segmentList.length - 1;
			if (preserveEndpoints && isBothEndsIdx) {
				const newPoints = [...points];

				// If the segment is the last segment, add a new vertex at the end.
				if (idx === segmentList.length - 1) {
					const newPoint = {
						id: newId(),
						type: "PathPoint",
						geometryType: "point",
						x: segment.endX,
						y: segment.endY,
					} as PathPointState;
					newPoints.splice(newPoints.length - 1, 0, newPoint);
					newSegment.endPointId = newPoint.id;
				}

				// If the segment is the first segment, add a new vertex at the start.
				if (idx === 0) {
					const newPoint = {
						id: newId(),
						type: "PathPoint",
						geometryType: "point",
						x: segment.startX,
						y: segment.startY,
					} as PathPointState;
					newPoints.splice(1, 0, newPoint);
					newSegment.startPointId = newPoint.id;
				}

				updatedPoints = newPoints;
			}

			// Track segment for drag updates.
			setDraggingSegment(newSegment);

			// Notify drag start with potentially updated points.
			onDiagramChange?.({
				eventId: e.eventId,
				eventPhase: e.eventPhase,
				id,
				startDiagram: {
					points: startPoints.current,
				} as DiagramChangeData<PathState>,
				endDiagram: {
					points: updatedPoints,
				} as DiagramChangeData<PathState>,
				minX: e.minX,
				minY: e.minY,
			});

			// End drag start operation.
			return;
		}

		// Type guard.
		if (!draggingSegment || !startSegment.current) return;

		// Calculate new segment position based on drag event.
		const dx = e.endX - e.startX;
		const dy = e.endY - e.startY;
		const newStartX = startSegment.current.startX + dx;
		const newStartY = startSegment.current.startY + dy;
		const newEndX = startSegment.current.endX + dx;
		const newEndY = startSegment.current.endY + dy;

		// Update the segment being dragged with new coordinates.
		setDraggingSegment({
			...draggingSegment,
			startX: newStartX,
			startY: newStartY,
			endX: newEndX,
			endY: newEndY,
		});

		// Update points with new vertex positions
		const updatedPoints = points.map((point) => {
			if (point.id === draggingSegment.startPointId) {
				return { ...point, x: newStartX, y: newStartY };
			}
			if (point.id === draggingSegment.endPointId) {
				return { ...point, x: newEndX, y: newEndY };
			}
			return point;
		});

		if (e.eventPhase === "Ended") {
			// Notify parent component of vertex position changes from segment drag
			onDiagramChange?.({
				eventId: e.eventId,
				eventPhase: e.eventPhase,
				id,
				startDiagram: {
					points: startPoints.current,
				} as DiagramChangeData<PathState>,
				endDiagram: {
					points: updatedPoints,
				} as DiagramChangeData<PathState>,
				minX: e.minX,
				minY: e.minY,
			});

			setDraggingSegment(undefined);
		} else {
			// Notify parent component of vertex position changes from segment drag
			onDiagramChange?.({
				eventId: e.eventId,
				eventPhase: e.eventPhase,
				id,
				startDiagram: {
					points: startPoints.current,
				} as DiagramChangeData<PathState>,
				endDiagram: {
					points: updatedPoints,
				} as DiagramChangeData<PathState>,
				minX: e.minX,
				minY: e.minY,
			});
		}
	}, []);

	return segmentList.map((item) => (
		<SegmentDragHandle
			key={item.id}
			{...item}
			perpendicularDrag={perpendicularDrag}
			zoom={zoom}
			onClick={onClick}
			onDrag={handleSegmentDrag}
		/>
	));
};

export const SegmentDragHandles = memo(SegmentDragHandlesComponent);
