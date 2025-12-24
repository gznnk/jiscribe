import { calcOrientedFrameFromPoints } from "@workspace/geometry";
import type React from "react";
import { memo, useCallback, useRef, useState } from "react";

import type { PathPointData } from "../../../../types/data/shapes/PathPointData";
import type {
	DiagramChangeData,
	DiagramChangeEvent,
} from "../../../../types/events/DiagramChangeEvent";
import type { DiagramClickEvent } from "../../../../types/events/DiagramClickEvent";
import type { DiagramDragEvent } from "../../../../types/events/DiagramDragEvent";
import type { DiagramPointerEvent } from "../../../../types/events/DiagramPointerEvent";
import type { Diagram } from "../../../../types/state/core/Diagram";
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
	rotation: number;
	scaleX: number;
	scaleY: number;
	perpendicularDrag: boolean;
	preserveEndpoints: boolean;
	items: Diagram[];
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
	rotation,
	scaleX,
	scaleY,
	perpendicularDrag,
	preserveEndpoints,
	items,
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

	// Items of owner Path component at the start of the segment drag.
	const startItems = useRef<Diagram[]>(items);

	// Build segment list: all segments normally, only dragged segment during drag operation.
	const segmentList: SegmentDragHandleData[] = [];
	if (draggingSegment) {
		segmentList.push(draggingSegment);
	} else {
		for (let i = 0; i < items.length - 1; i++) {
			const item = items[i];
			const nextItem = items[i + 1];

			segmentList.push({
				id: `${item.id}-${nextItem.id}`,
				startX: item.x,
				startY: item.y,
				startPointId: item.id,
				endX: nextItem.x,
				endY: nextItem.y,
				endPointId: nextItem.id,
			});
		}
	}

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		// Component properties
		id,
		rotation,
		scaleX,
		scaleY,
		items,
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
			rotation,
			scaleX,
			scaleY,
			preserveEndpoints,
			items,
			onDiagramChange,
			draggingSegment,
			segmentList,
		} = refBus.current;

		// Process the drag start event.
		if (e.eventPhase === "Started") {
			// Store the items at the start of the segment drag.
			startItems.current = items;

			// Find the index of the segment being dragged.
			const idx = segmentList.findIndex((v) => v.id === e.id);

			// Store segment data at the start of the segment drag.
			const segment = segmentList[idx];
			startSegment.current = segment;

			// Prepare a new segment data.
			const newSegment = {
				...segment,
			};

			let updatedItems = items;

			// If endpoints are preserved, add a new vertex when moving end segments.
			const isBothEndsIdx = idx === 0 || idx === segmentList.length - 1;
			if (preserveEndpoints && isBothEndsIdx) {
				const newItems = [...items];

				// If the segment is the last segment, add a new vertex at the end.
				if (idx === segmentList.length - 1) {
					const newItem = {
						id: newId(),
						type: "PathPoint",
						x: segment.endX,
						y: segment.endY,
					} as PathPointData;
					newItems.splice(newItems.length - 1, 0, newItem);
					newSegment.endPointId = newItem.id;
				}

				// If the segment is the first segment, add a new vertex at the start.
				if (idx === 0) {
					const newItem = {
						id: newId(),
						type: "PathPoint",
						x: segment.startX,
						y: segment.startY,
					} as PathPointData;
					newItems.splice(1, 0, newItem);
					newSegment.startPointId = newItem.id;
				}

				updatedItems = newItems;
			}

			// Track segment for drag updates.
			setDraggingSegment(newSegment);

			// Notify drag start with potentially updated items.
			onDiagramChange?.({
				eventId: e.eventId,
				eventPhase: e.eventPhase,
				id,
				startDiagram: {
					items: startItems.current,
				} as PathState,
				endDiagram: {
					items: updatedItems,
				} as PathState,
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

		// Update items with new vertex positions
		const updatedItems = items.map((item) => {
			if (item.id === draggingSegment.startPointId) {
				return { ...item, x: newStartX, y: newStartY };
			}
			if (item.id === draggingSegment.endPointId) {
				return { ...item, x: newEndX, y: newEndY };
			}
			return item;
		});

		if (e.eventPhase === "Ended") {
			// Calculate new bounding box from updated points
			const newFrame = calcOrientedFrameFromPoints(
				updatedItems.map((p) => ({ x: p.x, y: p.y })),
				rotation,
				scaleX,
				scaleY,
			);

			// Notify parent component of vertex position changes from segment drag
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

			setDraggingSegment(undefined);
		} else {
			// Notify parent component of vertex position changes from segment drag
			onDiagramChange?.({
				eventId: e.eventId,
				eventPhase: e.eventPhase,
				id,
				startDiagram: {
					items: startItems.current,
				} as PathState,
				endDiagram: {
					items: updatedItems,
				} as PathState,
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
