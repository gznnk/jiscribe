import type React from "react";
import { memo, useCallback, useRef } from "react";

import type { SegmentDragHandleData } from "./SegmentDragHandleTypes";
import type { Point } from "../../../../types/core/Point";
import type { DiagramClickEvent } from "../../../../types/events/DiagramClickEvent";
import type { DiagramDragEvent } from "../../../../types/events/DiagramDragEvent";
import type { DiagramPointerEvent } from "../../../../types/events/DiagramPointerEvent";
import { radiansToDegrees } from "../../../../utils/math/common/radiansToDegrees";
import { createLinearX2yFunction } from "../../../../utils/math/geometry/createLinearX2yFunction";
import { createLinearY2xFunction } from "../../../../utils/math/geometry/createLinearY2xFunction";
import { calcRadians } from "../../../../utils/math/points/calcRadians";
import { rotatePoint } from "../../../../utils/math/points/rotatePoint";
import { getCursorFromAngle } from "../../../../utils/shapes/common/getCursorFromAngle";
import { DragLine } from "../../../core/DragLine";

/**
 * Line segment drag handle properties
 */
type SegmentDragHandleProps = SegmentDragHandleData & {
	perpendicularDrag: boolean;
	zoom?: number;
	onPointerDown?: (e: DiagramPointerEvent) => void;
	onClick?: (e: DiagramClickEvent) => void;
	onDrag?: (e: DiagramDragEvent) => void;
	dragPositioningFunction?: (point: Point) => Point;
};

/**
 * Line segment drag handle component
 */
const SegmentDragHandleComponent: React.FC<SegmentDragHandleProps> = ({
	id,
	startX,
	startY,
	endX,
	endY,
	perpendicularDrag,
	zoom,
	onClick,
	onDrag,
}) => {
	const midX = (startX + endX) / 2;
	const midY = (startY + endY) / 2;

	const rotateStartPoint = rotatePoint(startX, startY, midX, midY, Math.PI / 2);
	const rotateEndPoint = rotatePoint(endX, endY, midX, midY, Math.PI / 2);

	const radian = calcRadians(
		rotateStartPoint.x,
		rotateStartPoint.y,
		rotateEndPoint.x,
		rotateEndPoint.y,
	);
	const cursor = perpendicularDrag
		? getCursorFromAngle(radiansToDegrees(radian))
		: "move";

	// Use ref to hold referenced values to avoid frequent handler generation
	const refBusVal = {
		// State variables and functions
		radian,
		rotateStartPoint,
		rotateEndPoint,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	const dragPositioningFunction = useCallback((x: number, y: number) => {
		const { radian, rotateStartPoint, rotateEndPoint } = refBus.current;

		const degrees = radiansToDegrees(radian);
		const isX2y = (degrees + 405) % 180 > 90;
		return isX2y
			? createLinearX2yFunction(rotateStartPoint, rotateEndPoint)(x, y)
			: createLinearY2xFunction(rotateStartPoint, rotateEndPoint)(x, y);
	}, []);

	return (
		<DragLine
			id={id}
			x={midX}
			y={midY}
			startX={startX}
			startY={startY}
			endX={endX}
			endY={endY}
			cursor={cursor}
			zoom={zoom}
			onClick={onClick}
			onDrag={onDrag}
			dragPositioningFunction={
				perpendicularDrag ? dragPositioningFunction : undefined
			}
		/>
	);
};

export const SegmentDragHandle = memo(SegmentDragHandleComponent);
