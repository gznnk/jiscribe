import type React from "react";
import { memo, useRef } from "react";

import { RectangleElement } from "./RectangleStyled";
import { useBaseShape } from "../../../hooks/useBaseShape";
import { useFileDrop } from "../../../hooks/useFileDrop";
import type { RectangleProps } from "../../../types/props/shapes/RectangleProps";
import { mergeProps } from "../../../utils/core/mergeProps";
import { degreesToRadians } from "../../../utils/math/common/degreesToRadians";
import { convertStrokeDashTypeToArray } from "../../../utils/shapes/common/convertStrokeDashTypeToArray";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";
import { BaseShape } from "../BaseShape";

/**
 * Rectangle component
 */
const RectangleComponent: React.FC<RectangleProps> = ({
	id,
	x,
	y,
	width,
	height,
	cornerRadius,
	rotation,
	scaleX,
	scaleY,
	keepProportion,
	rotateEnabled,
	inversionEnabled,
	fill,
	stroke,
	strokeWidth,
	strokeDashType,
	isSelected,
	isAncestorSelected = false,
	isRootSelected = false,
	connectPoints,
	showConnectPoints = false,
	connectEnabled = true,
	text,
	textType,
	fontColor,
	fontSize,
	fontFamily,
	fontWeight,
	textAlign,
	verticalAlign,
	isTextEditing,
	isTextEditEnabled = true,
	isDragging = false,
	isTransparent,
	showOutline = false,
	outlineDisabled = false,
	isTransforming = false,
	onDrag,
	onDragOver,
	onDragLeave,
	onClick,
	onSelect,
	onConnect,
	onPreviewConnectLine,
	onTextChange,
	onFileDrop,
	onHoverChange,
}) => {
	// Reference to the SVG element to be transformed
	const svgRef = useRef<SVGRectElement>({} as SVGRectElement);

	// Use the unified base shape hook for all common interactions
	const baseShapeProps = useBaseShape({
		id,
		type: "Rectangle",
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

	// Handle file drop separately
	const fileDropProps = useFileDrop({ id, onFileDrop });

	// Compose props
	const composedProps = mergeProps(baseShapeProps, fileDropProps);

	// Generate rect transform attribute
	const transform = createSvgTransform(
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		x,
		y,
	);

	return (
		<BaseShape
			id={id}
			type="Rectangle"
			x={x}
			y={y}
			width={width}
			height={height}
			rotation={rotation}
			scaleX={scaleX}
			scaleY={scaleY}
			keepProportion={keepProportion}
			rotateEnabled={rotateEnabled}
			inversionEnabled={inversionEnabled}
			isSelected={isSelected}
			isAncestorSelected={isAncestorSelected}
			isRootSelected={isRootSelected}
			connectPoints={connectPoints}
			showConnectPoints={showConnectPoints}
			connectEnabled={connectEnabled}
			text={text}
			textType={textType}
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
			onConnect={onConnect}
			onPreviewConnectLine={onPreviewConnectLine}
		>
			<RectangleElement
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
				strokeDasharray={convertStrokeDashTypeToArray(
					strokeDashType,
					strokeWidth,
				)}
				tabIndex={0}
				cursor="move"
				isTransparent={isTransparent}
				transform={transform}
				ref={svgRef}
				{...composedProps}
			/>
		</BaseShape>
	);
};

export const Rectangle = memo(RectangleComponent);
