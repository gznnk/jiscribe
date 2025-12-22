import type React from "react";
import { memo } from "react";

import { RectangleElement } from "./RectangleStyled";
import type { RectangleProps } from "../../../types/props/shapes/RectangleProps";
import { degreesToRadians } from "../../../utils/math/common/degreesToRadians";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";
import { Textable } from "../../core/Textable";

/**
 * Rectangle minimap component - lightweight version without outlines, controls, and labels.
 */
const RectangleMinimapComponent: React.FC<RectangleProps> = ({
	id,
	x,
	y,
	width,
	height,
	cornerRadius,
	rotation,
	scaleX,
	scaleY,
	fill,
	stroke,
	strokeWidth,
	text,
	textType,
	fontColor,
	fontSize,
	fontFamily,
	fontWeight,
	textAlign,
	verticalAlign,
	isTextEditEnabled = true,
	isTransparent,
}) => {
	// Generate rect transform attribute
	const transform = createSvgTransform(
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		x,
		y,
	);

	return (
		<>
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
				isTransparent={isTransparent}
				transform={transform}
				pointerEvents="none"
			/>
			{isTextEditEnabled && text && (
				<Textable
					x={-width / 2}
					y={-height / 2}
					width={width}
					height={height}
					transform={transform}
					text={text}
					textType={textType}
					fontColor={fontColor}
					fontSize={fontSize}
					fontFamily={fontFamily}
					fontWeight={fontWeight}
					textAlign={textAlign}
					verticalAlign={verticalAlign}
					isTextEditing={false}
				/>
			)}
		</>
	);
};

export const RectangleMinimap = memo(RectangleMinimapComponent);
