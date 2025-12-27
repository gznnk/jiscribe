import type { Point } from "@workspace/geometry";
import type React from "react";
import { memo, useRef } from "react";

import { Circle } from "./DragPointStyled";
import {
	DRAG_POINT_STROKE,
	DRAG_POINT_FILL,
	DRAG_POINT_OUTLINE,
} from "../../../constants/styling/core/DragPointStyling";
import { useDrag } from "../../../hooks/useDrag";
import { useHover } from "../../../hooks/useHover";
import type { DiagramType } from "../../../types/core/DiagramType";
import type { DiagramDragDropEvent } from "../../../types/events/DiagramDragDropEvent";
import type { DiagramDragEvent } from "../../../types/events/DiagramDragEvent";
import type { DiagramHoverChangeEvent } from "../../../types/events/DiagramHoverChangeEvent";

/**
 * Props for the DragPoint component.
 */
export type DragPointProps = {
	id: string;
	type?: DiagramType;
	x: number;
	y: number;
	radius?: number;
	stroke?: string;
	fill?: string;
	cursor?: string;
	outline?: string;
	isTransparent?: boolean;
	hidden?: boolean;
	zoom?: number;
	onDrag?: (e: DiagramDragEvent) => void;
	onDragOver?: (e: DiagramDragDropEvent) => void;
	onDragLeave?: (e: DiagramDragDropEvent) => void;
	onDrop?: (e: DiagramDragDropEvent) => void;
	onHoverChange?: (e: DiagramHoverChangeEvent) => void;
	dragPositioningFunction?: (x: number, y: number) => Point;
};

/**
 * Draggable point component.
 */
const DragPointComponent: React.FC<DragPointProps> = ({
	id,
	type,
	x,
	y,
	radius = 5,
	stroke = DRAG_POINT_STROKE,
	fill = DRAG_POINT_FILL,
	cursor = "move",
	outline = DRAG_POINT_OUTLINE,
	isTransparent = false,
	hidden = false,
	zoom = 1,
	onDrag,
	onDragOver,
	onDragLeave,
	onDrop,
	onHoverChange,
	dragPositioningFunction,
}) => {
	const svgRef = useRef<SVGCircleElement>({} as SVGCircleElement);

	// Adjust radius and strokeWidth based on zoom level to maintain consistent visual size
	const adjustedRadius = radius / zoom;
	const adjustedStrokeWidth = 1 / zoom;

	const dragProps = useDrag({
		id,
		type,
		x,
		y,
		ref: svgRef,
		onDrag,
		onDragOver,
		onDragLeave,
		onDrop,
		dragPositioningFunction,
	});
	const hoverProps = useHover({
		id,
		onHoverChange,
	});

	if (hidden) {
		return;
	}

	return (
		<Circle
			id={id}
			cx={x}
			cy={y}
			r={adjustedRadius}
			stroke={stroke}
			strokeWidth={adjustedStrokeWidth}
			fill={fill}
			cursor={cursor}
			outline={outline}
			outlineWidth={adjustedStrokeWidth}
			tabIndex={0}
			isTransparent={isTransparent}
			ref={svgRef}
			{...dragProps}
			{...hoverProps}
		/>
	);
};

export const DragPoint = memo(DragPointComponent);
