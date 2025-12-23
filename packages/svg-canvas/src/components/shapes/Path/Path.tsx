import type React from "react";
import { memo, useRef } from "react";

import {
	createEndPointArrowHead,
	createStartPointArrowHead,
} from "./PathUtils";
import { useClick } from "../../../hooks/useClick";
import { useDrag } from "../../../hooks/useDrag";
import { useSelect } from "../../../hooks/useSelect";
import type { PathProps } from "../../../types/props/shapes/PathProps";
import { mergeProps } from "../../../utils/core/mergeProps";
import { convertStrokeDashTypeToArray } from "../../../utils/shapes/common/convertStrokeDashTypeToArray";
import { createPathDValue } from "../../../utils/shapes/path/createPathDValue";

/**
 * Path component
 */
const PathComponent: React.FC<PathProps> = ({
	id,
	x,
	y,
	stroke = "black",
	strokeWidth = 1,
	strokeDashType = "solid",
	isSelected = false,
	isAncestorSelected = false,
	items = [],
	pathType,
	startArrowHead = "None",
	endArrowHead = "None",
	dragEnabled = true,
	onClick,
	onDrag,
	onSelect,
}) => {
	const dragSvgRef = useRef<SVGPathElement>({} as SVGPathElement);

	// To avoid frequent handler generation, hold referenced values in useRef
	const refBusVal = {
		// Properties
		id,
		x,
		y,
		isSelected,
		dragEnabled,
		onDrag,
		onSelect,
		onClick,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	// Generate drag properties for path element.
	const dragProps = useDrag({
		id,
		type: "Path",
		x,
		y,
		ref: dragSvgRef,
		onDrag: dragEnabled ? onDrag : undefined,
	});

	// Generate click properties for path element.
	const clickProps = useClick({
		id,
		x,
		y,
		isSelected,
		isAncestorSelected,
		ref: dragSvgRef,
		onClick,
	});

	// Generate select properties for path element.
	const selectProps = useSelect({
		id,
		onSelect,
	});

	// Compose props for path element
	const composedProps = mergeProps(dragProps, clickProps, selectProps);

	// Calculate trim values based on arrow head presence
	const startTrim = startArrowHead && startArrowHead !== "None" ? strokeWidth : 0;
	const endTrim = endArrowHead && endArrowHead !== "None" ? strokeWidth : 0;

	// Generate polyline d attribute value
	const d = createPathDValue(items, pathType, startTrim, endTrim);

	// Convert strokeDashType to strokeDasharray value
	const strokeDasharray = convertStrokeDashTypeToArray(
		strokeDashType,
		strokeWidth,
	);

	// Create path data for arrow heads
	const pathData = {
		items,
		stroke,
		pathType,
		startArrowHead,
		endArrowHead,
	};

	return (
		<>
			{/* Path for drawing */}
			<path
				d={d}
				fill="none"
				stroke={stroke}
				strokeWidth={strokeWidth}
				strokeDasharray={strokeDasharray}
			/>
			{/* Path for dragging */}
			<path
				id={id}
				d={d}
				fill="none"
				stroke="transparent"
				strokeWidth={Math.max(5, strokeWidth)}
				cursor={dragEnabled ? "move" : "pointer"}
				tabIndex={0}
				ref={dragSvgRef}
				{...composedProps}
			/>
				{/* Arrow heads */}
			{createStartPointArrowHead(pathData)}
			{createEndPointArrowHead(pathData)}
		</>
	);
};

export const Path = memo(PathComponent);
