import type React from "react";
import { memo, useRef } from "react";

import { useClick } from "../../../hooks/useClick";
import type { DragProps } from "../../../hooks/useDrag";
import { useDrag } from "../../../hooks/useDrag";
import type { DiagramClickEvent } from "../../../types/events/DiagramClickEvent";
import { mergeProps } from "../../../utils/core/mergeProps";

/**
 * Props for the DragLine component.
 */
type DragLineProps = Omit<DragProps, "ref"> & {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	cursor: string;
	zoom?: number;
	onClick?: (e: DiagramClickEvent) => void;
};

/**
 * Draggable line component.
 */
const DragLineComponent: React.FC<DragLineProps> = ({
	id,
	x,
	y,
	startX,
	startY,
	endX,
	endY,
	cursor,
	zoom = 1,
	onPointerDown,
	onClick,
	onDrag,
	dragPositioningFunction,
}) => {
	const svgRef = useRef<SVGLineElement>({} as SVGLineElement);

	// Adjust stroke width based on zoom level to maintain consistent visual size
	const adjustedStrokeWidth = 5 / zoom;

	const dragProps = useDrag({
		id,
		x,
		y,
		ref: svgRef,
		onPointerDown,
		onDrag,
		dragPositioningFunction,
	});
	const clickProps = useClick({
		id,
		x,
		y,
		ref: svgRef,
		onClick,
	});

	// Compose props for line element
	const composedProps = mergeProps(dragProps, clickProps);

	return (
		<line
			id={id}
			x1={startX}
			y1={startY}
			x2={endX}
			y2={endY}
			stroke="transparent"
			strokeWidth={adjustedStrokeWidth}
			cursor={cursor}
			ref={svgRef}
			{...composedProps}
		/>
	);
};

export const DragLine = memo(DragLineComponent);
