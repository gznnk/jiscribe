import type React from "react";
import { memo } from "react";

import { DiamondElement } from "./DiamondStyled";
import type { DiamondState } from "../../../../states/objects/primitives/diamond/DiamondState";
import { TextOverlay } from "../../base/TextOverlay";
import type { TextEditable } from "../../base/TextOverlay";
import { createSvgTransform } from "../../utils/createSvgTransform";
import { getStrokeDasharray } from "../../utils/getStrokeDasharray";
import { resolveAutoColor } from "../../utils/resolveAutoColor";

type DiamondProps = DiamondState & TextEditable;

/**
 * 中心原点を頂点とする菱形（上・右・下・左）のポリゴン点列を作る。
 * テキストは菱形内ではなく BoundingBox 相当の矩形（-w/2,-h/2,w,h）に収める。
 */
const buildDiamondPoints = (width: number, height: number): string => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	return [
		`0,${-halfHeight}`,
		`${halfWidth},0`,
		`0,${halfHeight}`,
		`${-halfWidth},0`,
	].join(" ");
};

const DiamondComponent: React.FC<DiamondProps> = ({
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
	strokeDashType,
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

	return (
		<>
			<DiamondElement
				data-kind="object"
				data-id={id}
				points={buildDiamondPoints(width, height)}
				transform={transformAttr}
				strokeColor={resolveAutoColor(stroke, "ink")}
				fillColor={resolveAutoColor(fill, "surface")}
				strokeWidth={strokeWidth}
				strokeDasharray={getStrokeDasharray(strokeDashType, strokeWidth)}
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

export const Diamond = memo(DiamondComponent);
