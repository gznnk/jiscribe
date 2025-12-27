import { degreesToRadians } from "@workspace/geometry";
import type React from "react";
import { memo } from "react";

import { EllipseElement } from "./EllipseStyled";
import type { EllipseProps } from "../../../types/props/shapes/EllipseProps";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";
import { Textable } from "../../core/Textable";

/**
 * Ellipse minimap component - lightweight version without outlines, controls, and labels.
 */
const EllipseMinimapComponent: React.FC<EllipseProps> = ({
	id,
	cx,
	cy,
	rx,
	ry,
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
	const width = rx * 2;
	const height = ry * 2;

	// Generate ellipse transform attribute
	const transform = createSvgTransform(
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		cx,
		cy,
	);

	return (
		<>
			<EllipseElement
				id={id}
				cx={0}
				cy={0}
				rx={width / 2}
				ry={height / 2}
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

export const EllipseMinimap = memo(EllipseMinimapComponent);
