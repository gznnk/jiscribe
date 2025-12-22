import type React from "react";
import { memo, useRef } from "react";

import { STICKY_FOLD_SIZE } from "../../../constants/styling/diagrams/StickyStyleConstants";
import { useBaseShape } from "../../../hooks/useBaseShape";
import type { StickyProps } from "../../../types/props/diagrams/StickyProps";
import { degreesToRadians } from "../../../utils/math/common/degreesToRadians";
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

	// Generate transform attribute
	const transform = createSvgTransform(
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		x,
		y,
	);

	// Create polygon points for sticky note with folded corner
	const foldSize = STICKY_FOLD_SIZE;
	const left = -width / 2;
	const right = width / 2;
	const top = -height / 2;
	const bottom = height / 2;

	const points = [
		[left, top], // Top-left
		[right, top], // Top-right
		[right, bottom - foldSize], // Right side until fold
		[right - foldSize, bottom], // Fold corner
		[left, bottom], // Bottom-left
	]
		.map(([px, py]) => `${px},${py}`)
		.join(" ");

	// Create fold triangle points for shadow effect
	const foldTrianglePoints = [
		[right - foldSize, bottom - foldSize], // Fold inner corner
		[right, bottom - foldSize], // Right side
		[right - foldSize, bottom], // Bottom side
	]
		.map(([px, py]) => `${px},${py}`)
		.join(" ");

	return (
		<BaseShape
			id={id}
			type="Sticky"
			x={x}
			y={y}
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
			{/* Main sticky note with folded corner */}
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

			{/* Folded corner shadow */}
			<polygon
				points={foldTrianglePoints}
				fill="rgba(0,0,0,0.1)"
				stroke="none"
				transform={transform}
				pointerEvents="none"
			/>
		</BaseShape>
	);
};

export const Sticky = memo(StickyComponent);
