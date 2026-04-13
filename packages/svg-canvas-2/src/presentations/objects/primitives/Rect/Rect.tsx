import type React from "react";
import { memo } from "react";

import { RectElement } from "./RectStyled";
import type { RectState } from "../../../../states/objects/primitives/rect/RectState";
import { TextOverlay } from "../../base/TextOverlay";
import { createSvgTransform } from "../../utils/createSvgTransform";

type RectProps = RectState;

const RectComponent: React.FC<RectProps> = ({
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
}) => {
	const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);

	return (
		<>
			<RectElement
				data-kind="object"
				data-id={id}
				x={-width / 2}
				y={-height / 2}
				width={width}
				height={height}
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
			/>
		</>
	);
};

export const Rect = memo(RectComponent);
