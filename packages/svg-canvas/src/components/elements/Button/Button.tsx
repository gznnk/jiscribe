import type React from "react";
import { memo, useRef } from "react";

import { ButtonElement } from "./ButtonStyled";
import { ButtonDefaultState } from "../../../constants/state/elements/ButtonDefaultState";
import { useBaseShape } from "../../../hooks/useBaseShape";
import type { ButtonProps } from "../../../types/props/elements/ButtonProps";
import { degreesToRadians } from "../../../utils/math/common/degreesToRadians";
import { convertStrokeDashTypeToArray } from "../../../utils/shapes/common/convertStrokeDashTypeToArray";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";
import { BaseShape } from "../../shapes/BaseShape";

/**
 * Button component
 */
const ButtonComponent: React.FC<ButtonProps> = ({
	id,
	x,
	y,
	width,
	height,
	cornerRadius = ButtonDefaultState.cornerRadius,
	rotation,
	scaleX,
	scaleY,
	keepProportion,
	rotateEnabled,
	inversionEnabled,
	fill = ButtonDefaultState.fill,
	stroke = ButtonDefaultState.stroke,
	strokeWidth = ButtonDefaultState.strokeWidth,
	strokeDashType = ButtonDefaultState.strokeDashType,
	isSelected,
	isAncestorSelected = false,
	connectPoints = [],
	showConnectPoints = false,
	connectEnabled = true,
	text,
	textType = ButtonDefaultState.textType,
	fontColor = ButtonDefaultState.fontColor,
	fontSize = ButtonDefaultState.fontSize,
	fontFamily = ButtonDefaultState.fontFamily,
	fontWeight = ButtonDefaultState.fontWeight,
	textAlign = ButtonDefaultState.textAlign,
	verticalAlign = ButtonDefaultState.verticalAlign,
	isTextEditing,
	isTextEditEnabled = true,
	isDragging = false,
	isRootSelected = false,
	isTransparent,
	showOutline = false,
	outlineDisabled = false,
	isTransforming = false,
	effectsEnabled = false,
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
	const svgRef = useRef<SVGRectElement>({} as SVGRectElement);

	// Use the unified base shape hook for all common interactions
	const baseShapeProps = useBaseShape({
		id,
		type: "Button",
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
			type="Button"
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
			<ButtonElement
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
				effectsEnabled={effectsEnabled}
				transform={transform}
				ref={svgRef}
				{...baseShapeProps}
			/>
		</BaseShape>
	);
};

export const Button = memo(ButtonComponent);
