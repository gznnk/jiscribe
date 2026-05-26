import type React from "react";
import { memo, useCallback, useRef, useState } from "react";

import type {
	DiagramChangeData,
	DiagramChangeEvent,
} from "../../../../types/events/DiagramChangeEvent";
import type { DiagramDragEvent } from "../../../../types/events/DiagramDragEvent";
import type { PathPointState } from "../../../../types/state/shapes/PathPointState";
import { PathPoint } from "../../../shapes/PathPoint";

/**
 * VertexHandles properties
 */
type VertexHandlesProps = {
	id: string;
	points: PathPointState[];
	zoom: number;
	hideEndpoints?: boolean;
	onDiagramChange?: (e: DiagramChangeEvent) => void;
};

/**
 * VertexHandles component
 */
const VertexHandlesComponent: React.FC<VertexHandlesProps> = ({
	id,
	points,
	zoom,
	hideEndpoints = false,
	onDiagramChange,
}) => {
	const [draggingPathPointId, setDraggingPathPointId] = useState<string | null>(
		null,
	);

	const startPoints = useRef<PathPointState[] | null>(null);

	// To avoid frequent handler generation, hold referenced values in useRef
	const refBusVal = {
		id,
		points,
		onDiagramChange,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	/**
	 * Vertex drag event handler
	 */
	const handlePathPointDrag = useCallback((e: DiagramDragEvent) => {
		const { id, points, onDiagramChange } = refBus.current;

		if (e.eventPhase === "Started") {
			setDraggingPathPointId(e.id);
			startPoints.current = points;
		}

		if (startPoints.current === null) {
			return;
		}

		onDiagramChange?.({
			id,
			eventId: e.eventId,
			eventPhase: e.eventPhase,
			startDiagram: {
				points: startPoints.current,
			} as DiagramChangeData,
			endDiagram: {
				points: points.map((point) => {
					if (e.id === point.id) {
						return {
							...point,
							x: e.endX,
							y: e.endY,
						};
					}
					return point;
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
			{points.map((point, i) => {
				if (hideEndpoints && (i === 0 || i === points.length - 1)) {
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
