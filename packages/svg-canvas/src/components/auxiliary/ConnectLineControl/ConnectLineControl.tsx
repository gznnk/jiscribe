import type { TransformedFrame } from "@workspace/geometry";
import type React from "react";
import { memo, useCallback, useState } from "react";

import { PathControl, type PathControlProps } from "../PathControl";
import { ReconnectionHandles } from "./ReconnectionHandles/ReconnectionHandles";
import { SegmentDragHandles } from "./SegmentDragHandles";
import type { DiagramChangeEvent } from "../../../types/events/DiagramChangeEvent";

/**
 * Props for the ConnectLineControl component.
 * Extends PathControlProps and adds ConnectLine-specific properties.
 */
export type ConnectLineControlProps = PathControlProps & {
	startOwnerId?: string;
	endOwnerId?: string;
	startOwnerFrame?: TransformedFrame;
	endOwnerFrame?: TransformedFrame;
	autoRouting?: boolean;
};

/**
 * Component that handles ConnectLine control operations.
 * Wraps PathControl and adds ConnectLine-specific functionality (ReconnectionHandles and SegmentDragHandles).
 */
const ConnectLineControlComponent: React.FC<ConnectLineControlProps> = ({
	id,
	points,
	pathType,
	startOwnerId,
	endOwnerId,
	startOwnerFrame,
	endOwnerFrame,
	autoRouting = false,
	zoom = 1,
	onDiagramChange,
}) => {
	// Track dragging state for each handle type
	const [isDraggingSegment, setIsDraggingSegment] = useState(false);
	const [isDraggingReconnection, setIsDraggingReconnection] = useState(false);

	/**
	 * Change event handler for SegmentDragHandles
	 */
	const handleSegmentDiagramChange = useCallback(
		(e: DiagramChangeEvent) => {
			if (e.eventPhase === "Started") {
				setIsDraggingSegment(true);
			} else if (e.eventPhase === "Ended") {
				setIsDraggingSegment(false);
			}

			onDiagramChange?.(e);
		},
		[onDiagramChange],
	);

	/**
	 * Change event handler for ReconnectionHandles
	 */
	const handleReconnectionDiagramChange = useCallback(
		(e: DiagramChangeEvent) => {
			if (e.eventPhase === "Started") {
				setIsDraggingReconnection(true);
			} else if (e.eventPhase === "Ended") {
				setIsDraggingReconnection(false);
			}

			onDiagramChange?.(e);
		},
		[onDiagramChange],
	);

	// Display flags for each control type
	const showPathControl =
		pathType !== "Straight" && !isDraggingSegment && !isDraggingReconnection;

	const showSegmentDragHandles =
		pathType !== "Straight" && !isDraggingReconnection;

	const showReconnectionHandles = !isDraggingSegment;

	return (
		<>
			{/* SegmentDragHandles (ConnectLine-specific) */}
			{showSegmentDragHandles && (
				<SegmentDragHandles
					id={id}
					perpendicularDrag={true}
					preserveEndpoints={true}
					points={points}
					zoom={zoom}
					onDiagramChange={handleSegmentDiagramChange}
				/>
			)}
			{/* PathControl with ConnectLine-specific settings */}
			{showPathControl && (
				<PathControl
					id={id}
					points={points}
					pathType={pathType}
					enableMidpointHandles={false}
					hideEndpoints={true}
					zoom={zoom}
					onDiagramChange={onDiagramChange}
				/>
			)}
			{/* ReconnectionHandles (ConnectLine-specific) */}
			{showReconnectionHandles && (
				<ReconnectionHandles
					id={id}
					points={points}
					startOwnerId={startOwnerId}
					endOwnerId={endOwnerId}
					startOwnerFrame={startOwnerFrame}
					endOwnerFrame={endOwnerFrame}
					autoRouting={autoRouting}
					zoom={zoom}
					onDiagramChange={handleReconnectionDiagramChange}
				/>
			)}
		</>
	);
};

export const ConnectLineControl = memo(ConnectLineControlComponent);
