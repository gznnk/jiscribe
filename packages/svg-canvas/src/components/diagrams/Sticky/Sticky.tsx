import { degreesToRadians } from "@workspace/geometry";
import type React from "react";
import { memo, useRef } from "react";

import { useBaseShape } from "../../../hooks/useBaseShape";
import type { StickyProps } from "../../../types/props/diagrams/StickyProps";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";
import { BaseShape } from "../../shapes/BaseShape";

/**
 * Sticky component - a sticky note diagram element
 */
const StickyComponent: React.FC<StickyProps> = ({
	id,
	x,
	y,
	width,
	height,
	minWidth,
	minHeight,
	rotation,
	scaleX,
	scaleY,
	keepProportion,
	rotateEnabled,
	inversionEnabled,
	fill,
	stroke,
	strokeWidth,
	text,
	fontColor,
	fontSize,
	fontFamily,
	fontWeight,
	textAlign,
	verticalAlign,
	isSelected,
	isAncestorSelected = false,
	isRootSelected = false,
	isTextEditEnabled = true,
	isTextEditing = false,
	isDragging = false,
	showOutline = false,
	outlineDisabled = false,
	isTransforming = false,
	onDrag,
	onDragOver,
	onDragLeave,
	onClick,
	onSelect,
	onTextChange,
	onHoverChange,
}) => {
	// Reference to the SVG element to be transformed
	const svgRef = useRef<SVGPolygonElement>({} as SVGPolygonElement);

	// Use the unified base shape hook for all common interactions
	const baseShapeProps = useBaseShape({
		id,
		type: "Sticky",
		x,
		y,
		isSelected,
		isAncestorSelected,
		isTextEditEnabled,
		ref: svgRef,
		onDrag,
		onDragOver,
		onDragLeave,
		onClick,
		onSelect,
		onTextChange,
		onHoverChange,
	});

	// Calculate center coordinates from top-left coordinates
	const cx = x + width / 2;
	const cy = y + height / 2;

	// Create transform attribute
	const transform = createSvgTransform(
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		cx,
		cy,
	);

	// Create polygon points for simple rectangle
	const left = -width / 2;
	const right = width / 2;
	const top = -height / 2;
	const bottom = height / 2;

	// Points for the main sticky note polygon
	const points = [
		[left, top], // Top-left
		[right, top], // Top-right
		[right, bottom], // Bottom-right
		[left, bottom], // Bottom-left
	]
		.map(([px, py]) => `${px},${py}`)
		.join(" ");

	// Points for the shadow polygon
	const shadowPoints = [
		[left + 3, top], // Top-left
		[right - 3, top], // Top-right
		[right + 3, bottom + 5], // Bottom-right
		[left - 3, bottom + 5], // Bottom-left
	]
		.map(([px, py]) => `${px},${py}`)
		.join(" ");

	return (
		<BaseShape
			id={id}
			type="Sticky"
			cx={cx}
			cy={cy}
			width={width}
			height={height}
			minWidth={minWidth}
			minHeight={minHeight}
			rotation={rotation}
			scaleX={scaleX}
			scaleY={scaleY}
			keepProportion={keepProportion}
			rotateEnabled={rotateEnabled}
			inversionEnabled={inversionEnabled}
			isSelected={isSelected}
			isAncestorSelected={isAncestorSelected}
			isRootSelected={isRootSelected}
			connectPoints={[]}
			showConnectPoints={false}
			connectEnabled={false}
			text={text}
			textType="textarea"
			fontColor={fontColor}
			fontSize={fontSize}
			fontFamily={fontFamily}
			fontWeight={fontWeight}
			textAlign={textAlign}
			verticalAlign={verticalAlign}
			isTextEditing={isTextEditing}
			isTextEditEnabled={isTextEditEnabled}
			isDragging={isDragging}
			showOutline={showOutline}
			outlineDisabled={outlineDisabled}
			isTransforming={isTransforming}
			transform={transform}
		>
			{/* Shadow */}
			<polygon
				points={shadowPoints}
				fill="rgba(0,0,0,0.08)"
				transform={transform}
				pointerEvents="none"
				filter="url(#sticky-blur)"
			/>

			{/* Main sticky note */}
			<polygon
				id={id}
				points={points}
				fill={fill}
				stroke={stroke}
				strokeWidth={strokeWidth}
				tabIndex={0}
				cursor="move"
				transform={transform}
				ref={svgRef}
				{...baseShapeProps}
			/>
		</BaseShape>
	);
};

export const Sticky = memo(StickyComponent);
