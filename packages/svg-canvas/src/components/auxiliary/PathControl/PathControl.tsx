import type React from "react";
import { memo, useCallback, useRef, useState } from "react";

import { MidpointHandles } from "./MidpointHandles";
import { VertexHandles } from "./VertexHandles";
import type { PathType } from "../../../types/core/PathType";
import type { DiagramChangeEvent } from "../../../types/events/DiagramChangeEvent";
import type { PathPointState } from "../../../types/state/shapes/PathPointState";
import { createDValue } from "../../../utils/shapes/path/createDValue";

/**
 * Props for the PathControl component.
 */
export type PathControlProps = {
	id: string;
	points: PathPointState[];
	pathType: PathType;
	enableMidpointHandles?: boolean;
	hideEndpoints?: boolean;
	zoom?: number;
	onDiagramChange?: (e: DiagramChangeEvent) => void;
};

/**
 * Component that handles path control operations.
 * Provides handles for editing path points, segments, and adding new vertices.
 */
const PathControlComponent: React.FC<PathControlProps> = ({
	id,
	points,
	pathType,
	enableMidpointHandles = true,
	hideEndpoints = false,
	zoom = 1,
	onDiagramChange,
}) => {
	// Track dragging state for each handle type
	const [isDraggingVertex, setIsDraggingVertex] = useState(false);
	const [isDraggingMidpoint, setIsDraggingMidpoint] = useState(false);

	// To avoid frequent handler generation, hold referenced values in useRef
	const refBusVal = {
		id,
		points,
		onDiagramChange,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	/**
	 * Change event handler for VertexHandles
	 */
	const handleVertexDiagramChange = useCallback((e: DiagramChangeEvent) => {
		const { onDiagramChange } = refBus.current;

		if (e.eventPhase === "Started") {
			setIsDraggingVertex(true);
		} else if (e.eventPhase === "Ended") {
			setIsDraggingVertex(false);
		}

		onDiagramChange?.(e);
	}, []);

	/**
	 * Change event handler for MidpointHandles
	 */
	const handleMidpointDiagramChange = useCallback((e: DiagramChangeEvent) => {
		const { onDiagramChange } = refBus.current;

		if (e.eventPhase === "Started") {
			setIsDraggingMidpoint(true);
		} else if (e.eventPhase === "Ended") {
			setIsDraggingMidpoint(false);
		}

		onDiagramChange?.(e);
	}, []);

	// Don't render anything for Straight paths
	if (pathType === "Straight") {
		return null;
	}

	// Check if any handle is being dragged
	const isAnyHandleDragging = isDraggingVertex || isDraggingMidpoint;

	// Display flags for each handle type
	const showVertexHandles = !isDraggingMidpoint;

	const showMidpointHandles = enableMidpointHandles && !isDraggingVertex;

	const showDashedGuideLines = pathType === "Curve" && !isAnyHandleDragging;

	return (
		<>
			{/* Dashed guide lines for Bézier curves */}
			{showDashedGuideLines && (
				<path
					d={createDValue(points)}
					fill="none"
					stroke="rgba(24, 144, 255, 0.8)"
					strokeWidth={1 / zoom}
					strokeDasharray={`${4 / zoom},${2 / zoom}`}
					pointerEvents="none"
				/>
			)}
			{/* Midpoint handles */}
			{showMidpointHandles && (
				<MidpointHandles
					id={id}
					points={points}
					zoom={zoom}
					onDiagramChange={handleMidpointDiagramChange}
				/>
			)}
			{/* Vertex handles */}
			{showVertexHandles && (
				<VertexHandles
					id={id}
					points={points}
					zoom={zoom}
					hideEndpoints={hideEndpoints}
					onDiagramChange={handleVertexDiagramChange}
				/>
			)}
		</>
	);
};

export const PathControl = memo(PathControlComponent);
