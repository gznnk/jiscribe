import type React from "react";
import { memo, useCallback, useRef, useState } from "react";

import type { DragProps } from "../../../hooks/useDrag";
import { useDrag } from "../../../hooks/useDrag";
import type { DiagramDragEvent } from "../../../types/events/DiagramDragEvent";
import { RotateRight } from "../../icons/RotateRight";

/**
 * Props for RotatePoint component.
 */
type RotatePointProps = Omit<DragProps, "ref"> & {
	rotation?: number;
	color?: string;
	hidden?: boolean;
	zoom?: number;
};

/**
 * The rotate point component.
 */
const RotatePointComponent: React.FC<RotatePointProps> = ({
	id,
	type,
	x,
	y,
	onDrag,
	dragPositioningFunction,
	rotation = 0,
	color = "rgba(107, 114, 128, 0.8)",
	hidden = false,
	zoom = 1,
}) => {
	const [isDragging, setIsDragging] = useState(false);
	const svgRef = useRef<SVGCircleElement>({} as SVGCircleElement);

	// Adjust size based on zoom level to maintain consistent visual size
	const scale = 1 / zoom;
	const adjustedRadius = 7 / zoom;
	const adjustedTextOffset = 16 / zoom;
	const adjustedFontSize = 12 / zoom;

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		onDrag,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	/**
	 * Handle drag event.
	 */
	const handleDrag = useCallback((e: DiagramDragEvent) => {
		if (e.eventPhase === "Started") setIsDragging(true);
		if (e.eventPhase === "Ended") setIsDragging(false);

		refBus.current.onDrag?.(e);
	}, []);

	// Create drag properties using the useDrag hook.
	const dragProps = useDrag({
		id,
		type,
		x,
		y,
		ref: svgRef,
		disableAutoEdgeScroll: true,
		onDrag: handleDrag,
		dragPositioningFunction,
	});

	if (hidden) {
		return;
	}

	return (
		<>
			<g transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}>
				<g transform="translate(-12 -12)">
					<RotateRight fill={color} />
				</g>
			</g>
			<circle
				id={id}
				cx={x}
				cy={y}
				r={adjustedRadius}
				fill="transparent"
				cursor="move"
				tabIndex={0}
				ref={svgRef}
				{...dragProps}
			/>
			{isDragging && (
				<text
					x={x + adjustedTextOffset}
					y={y + 4 / zoom}
					fill="rgba(107, 114, 128, 1)"
					fontSize={`${adjustedFontSize}px`}
				>{`${rotation}˚`}</text>
			)}
		</>
	);
};

export const RotatePoint = memo(RotatePointComponent);
