import type React from "react";
import { memo, useCallback, useRef, useState } from "react";

import type {
	DiagramChangeData,
	DiagramChangeEvent,
} from "../../../../types/events/DiagramChangeEvent";
import type { DiagramDragEvent } from "../../../../types/events/DiagramDragEvent";
import type { Diagram } from "../../../../types/state/core/Diagram";
import type { PathPointState } from "../../../../types/state/shapes/PathPointState";
import { PathPoint } from "../../../shapes/PathPoint";

/**
 * VertexHandles properties
 */
type VertexHandlesProps = {
	id: string;
	items: Diagram[];
	zoom: number;
	hideEndpoints?: boolean;
	onDiagramChange?: (e: DiagramChangeEvent) => void;
};

/**
 * VertexHandles component
 */
const VertexHandlesComponent: React.FC<VertexHandlesProps> = ({
	id,
	items,
	zoom,
	hideEndpoints = false,
	onDiagramChange,
}) => {
	const [draggingPathPointId, setDraggingPathPointId] = useState<string | null>(
		null,
	);

	const startItems = useRef<PathPointState[] | null>(null);

	// To avoid frequent handler generation, hold referenced values in useRef
	const refBusVal = {
		id,
		items,
		onDiagramChange,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	/**
	 * Vertex drag event handler
	 */
	const handlePathPointDrag = useCallback((e: DiagramDragEvent) => {
		const { id, items, onDiagramChange } = refBus.current;

		if (e.eventPhase === "Started") {
			setDraggingPathPointId(e.id);
			startItems.current = items;
		}

		if (startItems.current === null) return;

		onDiagramChange?.({
			id,
			eventId: e.eventId,
			eventPhase: e.eventPhase,
			startDiagram: {
				items: startItems.current,
			} as DiagramChangeData,
			endDiagram: {
				items: items.map((item) => {
					if (e.id === item.id) {
						return {
							...item,
							x: e.endX,
							y: e.endY,
						};
					}
					return item;
				}),
			} as DiagramChangeData,
			minX: e.minX,
			minY: e.minY,
		});

		if (e.eventPhase === "Ended") {
			setDraggingPathPointId(null);
		}
	}, []);

	return (
		<>
			{items.map((point, i) => {
				if (hideEndpoints && (i === 0 || i === items.length - 1)) {
					return null;
				}
				return (
					<PathPoint
						key={point.id}
						id={point.id}
						x={point.x}
						y={point.y}
						isTransparent={draggingPathPointId !== null}
						zoom={zoom}
						onDrag={handlePathPointDrag}
					/>
				);
			})}
		</>
	);
};

export const VertexHandles = memo(VertexHandlesComponent);
