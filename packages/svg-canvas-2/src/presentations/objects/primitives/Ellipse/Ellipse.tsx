import type React from "react";
import { memo } from "react";

import { EllipseElement } from "./EllipseStyled";
import type { EllipseState } from "../../../../states/objects/primitives/ellipse/EllipseState";
import { TextOverlay } from "../../base/TextOverlay";
import { createSvgTransform } from "../../utils/createSvgTransform";

type EllipseProps = EllipseState & {
	isEditing?: boolean;
};

const EllipseComponent: React.FC<EllipseProps> = ({
	id,
	cx,
	cy,
	width,
	height,
	scaleX,
	scaleY,
	rotation,
	fill,
	stroke,
	strokeWidth,
	text,
	textType,
	textAlign,
	verticalAlign,
	fontColor,
	fontSize,
	fontFamily,
	fontWeight,
	isEditing = false,
}) => {
	const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);

	const rx = width / 2;
	const ry = height / 2;

	return (
		<>
			<EllipseElement
				data-kind="object"
				data-id={id}
				cx={0}
				cy={0}
				rx={rx}
				ry={ry}
				transform={transformAttr}
				fill={fill ?? "transparent"}
				stroke={stroke}
				strokeWidth={strokeWidth}
			/>
			<TextOverlay
				x={-width / 2}
				y={-height / 2}
				width={width}
				height={height}
				transform={transformAttr}
				text={text}
				textType={textType}
				textAlign={textAlign}
				verticalAlign={verticalAlign}
				fontColor={fontColor}
				fontSize={fontSize}
				fontFamily={fontFamily}
				fontWeight={fontWeight}
				isEditing={isEditing}
			/>
		</>
	);
};

export const Ellipse = memo(EllipseComponent);
