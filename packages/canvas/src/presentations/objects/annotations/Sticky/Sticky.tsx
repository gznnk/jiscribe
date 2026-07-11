import type React from "react";
import { memo } from "react";

import type { StickyState } from "../../../../states/objects/annotations/sticky/StickyState";
import { TextOverlay } from "../../base/TextOverlay";
import type { TextEditable } from "../../base/TextOverlay";
import { calcTextRegion } from "../../utils/calcTextRegion";
import { createSvgTransform } from "../../utils/createSvgTransform";

type StickyProps = StickyState & TextEditable;

const StickyComponent: React.FC<StickyProps> = ({
	id,
	cx,
	cy,
	width,
	height,
	scaleX,
	scaleY,
	rotation,
	fill,
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
	const textRegion = calcTextRegion({ width, height });

	const left = -width / 2;
	const right = width / 2;
	const top = -height / 2;
	const bottom = height / 2;

	const points = [
		[left, top],
		[right, top],
		[right, bottom],
		[left, bottom],
	]
		.map(([px, py]) => `${px},${py}`)
		.join(" ");

	const shadowPoints = [
		[left + 3, top],
		[right - 3, top],
		[right + 3, bottom + 5],
		[left - 3, bottom + 5],
	]
		.map(([px, py]) => `${px},${py}`)
		.join(" ");

	return (
		<g data-kind="object" data-id={id} style={{ cursor: "grab" }}>
			{/* Shadow */}
			<polygon
				points={shadowPoints}
				fill="rgba(0,0,0,0.08)"
				transform={transformAttr}
				pointerEvents="none"
				filter="url(#sticky-blur)"
			/>
			{/* Main sticky note */}
			<polygon
				points={points}
				fill={fill ?? "#fef9c3"}
				transform={transformAttr}
			/>
			<TextOverlay
				x={textRegion.x}
				y={textRegion.y}
				width={textRegion.width}
				height={textRegion.height}
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
		</g>
	);
};

export const Sticky = memo(StickyComponent);
