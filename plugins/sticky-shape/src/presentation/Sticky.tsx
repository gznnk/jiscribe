import { BODY_TEXT_SLOT_ID } from "@workspace/canvas";
import type { TextEditable } from "@workspace/canvas-sdk";
import {
	TextOverlay,
	calcTextRegion,
	createSvgTransform,
	readTextSlot,
} from "@workspace/canvas-sdk";
import type React from "react";
import { memo } from "react";

import type { StickyState } from "../state/StickyState";

type StickyProps = StickyState & TextEditable;

/**
 * Drawn by hand rather than through `createFrameObject`: the paper sits under a
 * blurred offset shadow, so the type owns a group of two polygons instead of the
 * single styled shape that helper draws.
 */
const StickyComponent: React.FC<StickyProps> = (props) => {
	const {
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
		isEditing = false,
	} = props;
	const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);

	// Sticky is a "body"-feature type: its one slot is addressed by name rather
	// than enumerated, so a malformed multi-slot state cannot overlap-draw here.
	const bodySlot = text?.[BODY_TEXT_SLOT_ID];
	const textRegion = calcTextRegion(props, BODY_TEXT_SLOT_ID);

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
				text={readTextSlot(text, BODY_TEXT_SLOT_ID)}
				textAlign={bodySlot?.textAlign}
				verticalAlign={bodySlot?.verticalAlign}
				fontColor={bodySlot?.fontColor}
				fontSize={bodySlot?.fontSize}
				fontFamily={bodySlot?.fontFamily}
				fontWeight={bodySlot?.fontWeight}
				isEditing={isEditing}
			/>
		</g>
	);
};

export const Sticky = memo(StickyComponent);
