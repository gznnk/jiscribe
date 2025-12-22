import type React from "react";
import { memo, useRef } from "react";

import { EllipseElement } from "./EllipseStyled";
import { useBaseShape } from "../../../hooks/useBaseShape";
import type { EllipseProps } from "../../../types/props/shapes/EllipseProps";
import { degreesToRadians } from "../../../utils/math/common/degreesToRadians";
import { convertStrokeDashTypeToArray } from "../../../utils/shapes/common/convertStrokeDashTypeToArray";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";
import { BaseShape } from "../BaseShape";

/**
 * Ellipse component
 */
const EllipseComponent: React.FC<EllipseProps> = ({
	id,
	x,
	y,
	width,
	height,
	rotation,
	scaleX,
	scaleY,
	fill,
	stroke,
	strokeWidth,
	strokeDashType,
	keepProportion,
	rotateEnabled,
	inversionEnabled,
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
	onHoverChange,
}) => {
	// Reference to the SVG element to be transformed
	const svgRef = useRef<SVGEllipseElement>({} as SVGEllipseElement);

	// Use the unified base shape hook for all common interactions
	const baseShapeProps = useBaseShape({
		id,
		type: "Ellipse",
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

	// Generate ellipse transform attribute
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
			type="Ellipse"
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
			<EllipseElement
				id={id}
				cx={0}
				cy={0}
				rx={width / 2}
				ry={height / 2}
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
				{...baseShapeProps}
			/>
		</BaseShape>
	);
};

export const Ellipse = memo(EllipseComponent);
