import { degreesToRadians } from "@workspace/geometry";
import type React from "react";
import { memo, useMemo, useRef } from "react";

import { useClick } from "../../../hooks/useClick";
import { useDrag } from "../../../hooks/useDrag";
import { useExecutionChain } from "../../../hooks/useExecutionChain";
import { useHover } from "../../../hooks/useHover";
import { useSelect } from "../../../hooks/useSelect";
import type { FrameProps } from "../../../types/props/elements/FrameProps";
import { mergeProps } from "../../../utils/core/mergeProps";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";
import { ConnectPoints } from "../../shapes/ConnectPoints";

/**
 * Frame component - a simple rectangular frame element
 */
const FrameComponent: React.FC<FrameProps> = ({
	id,
	x,
	y,
	width,
	height,
	rotation,
	scaleX,
	scaleY,
	cornerRadius,
	fill = "transparent",
	stroke = "black",
	strokeWidth = 1,
	isSelected,
	isAncestorSelected = false,
	connectPoints,
	showConnectPoints = false,
	isDragging = false,
	isTransforming = false,
	children,
	onDrag,
	onDragOver,
	onDragLeave,
	onClick,
	onSelect,
	onConnect,
	onPreviewConnectLine,
	onHoverChange,
	onPropagation,
}) => {
	// Reference to the SVG element to be transformed
	const svgRef = useRef<SVGRectElement>({} as SVGRectElement);

	// Generate properties for dragging
	const dragProps = useDrag({
		id,
		type: "Frame",
		x,
		y,
		ref: svgRef,
		onDrag,
		onDragOver,
		onDragLeave,
	});

	// Generate properties for clicking
	const clickProps = useClick({
		id,
		x,
		y,
		isSelected,
		isAncestorSelected,
		ref: svgRef,
		onClick,
	});

	// Generate properties for selection
	const selectProps = useSelect({
		id,
		onSelect,
	});

	// Generate properties for hovering
	const hoverProps = useHover({
		id,
		onHoverChange,
	});

	// Compose props for the SVG element
	const composedProps = mergeProps(
		dragProps,
		clickProps,
		selectProps,
		hoverProps,
	);

	// Suppress ConnectPoint re-rendering by memoization
	// If separated by key and passed as individual props, each ConnectPoint side
	// performs comparison processing for each key which is inefficient, so detect Shape differences collectively here
	const ownerFrame = useMemo(
		() => ({
			cx: x + width / 2,
			cy: y + height / 2,
			width,
			height,
			rotation,
			scaleX,
			scaleY,
		}),
		[x, y, width, height, rotation, scaleX, scaleY],
	);

	// Generate rect transform attribute
	const transform = createSvgTransform(
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		x,
		y,
	);

	// Handle execution events using the execution chain hook
	useExecutionChain({
		id,
		onPropagation: (e) => {
			// Forward the event directly to the parent component
			onPropagation?.(e);
		},
	});

	return (
		<>
			{/* Main frame rectangle */}
			<rect
				id={id}
				x={-width / 2}
				y={-height / 2}
				width={width}
				height={height}
				rx={cornerRadius}
				ry={cornerRadius}
				fill={fill}
				stroke={stroke}
				strokeWidth={strokeWidth}
				tabIndex={0}
				cursor="move"
				transform={transform}
				ref={svgRef}
				{...composedProps}
			/>
			<g transform={transform}>{children}</g>
			<ConnectPoints
				ownerId={id}
				ownerFrame={ownerFrame}
				connectPoints={connectPoints}
				showConnectPoints={showConnectPoints}
				shouldRender={!isDragging && !isTransforming && !isSelected}
				onConnect={onConnect}
				onPreviewConnectLine={onPreviewConnectLine}
			/>
		</>
	);
};

export const Frame = memo(FrameComponent);
