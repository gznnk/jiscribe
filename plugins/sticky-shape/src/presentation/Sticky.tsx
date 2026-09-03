import { BODY_TEXT_SLOT_ID } from "@jiscribe/canvas";
import type { TextEditable } from "@jiscribe/canvas-sdk";
import {
	TextOverlay,
	calcFullTextRegion,
	createSvgTransform,
	readRichTextSlot,
	resolveAutoColor,
	useObjectTextStyleDefaultsRegistry,
} from "@jiscribe/canvas-sdk";
import type React from "react";
import { memo } from "react";

import {
	STICKY_SHADOW_DROP,
	STICKY_SHADOW_FILL,
	STICKY_SHADOW_FILTER_ID,
	STICKY_SHADOW_TAPER,
} from "./StickyShadowConstants";
import { StickyBody } from "./StickyStyled";
import type { StickyState } from "../state/StickyState";

type StickyProps = StickyState & TextEditable;

/**
 * Drawn by hand rather than through `createFrameObject`: the paper sits under a
 * blurred offset shadow, so the type owns a group of two polygons instead of the
 * single styled shape that helper draws. Everything that helper resolves has to
 * be resolved here instead — the paper's `"auto"` fill as much as the text-style
 * defaults below.
 */
const StickyComponent: React.FC<StickyProps> = (props) => {
	const {
		id,
		type,
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
	const textRegion = calcFullTextRegion(props);
	// Hand-drawn shapes have to resolve the type's own text-style defaults
	// themselves; createFrameObject does it for the shapes that go through it, and
	// the editing surface does it either way (issue #8).
	const style = useObjectTextStyleDefaultsRegistry().resolveSlotStyle(
		type,
		BODY_TEXT_SLOT_ID,
		bodySlot,
	);

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
		[left + STICKY_SHADOW_TAPER, top],
		[right - STICKY_SHADOW_TAPER, top],
		[right + STICKY_SHADOW_TAPER, bottom + STICKY_SHADOW_DROP],
		[left - STICKY_SHADOW_TAPER, bottom + STICKY_SHADOW_DROP],
	]
		.map(([px, py]) => `${px},${py}`)
		.join(" ");

	return (
		<g data-kind="object" data-id={id} style={{ cursor: "grab" }}>
			{/* Shadow */}
			<polygon
				points={shadowPoints}
				fill={STICKY_SHADOW_FILL}
				transform={transformAttr}
				pointerEvents="none"
				filter={`url(#${STICKY_SHADOW_FILTER_ID})`}
			/>
			{/* Main sticky note */}
			<StickyBody
				points={points}
				fillColor={resolveAutoColor(fill, "surface")}
				transform={transformAttr}
			/>
			<TextOverlay
				x={textRegion.x}
				y={textRegion.y}
				width={textRegion.width}
				height={textRegion.height}
				transform={transformAttr}
				text={readRichTextSlot(text, BODY_TEXT_SLOT_ID)}
				textAlign={style.textAlign}
				verticalAlign={style.verticalAlign}
				fontColor={style.fontColor}
				fontSize={style.fontSize}
				fontFamily={style.fontFamily}
				fontWeight={style.fontWeight}
				fontStyle={style.fontStyle}
				textDecoration={style.textDecoration}
				isEditing={isEditing}
			/>
		</g>
	);
};

export const Sticky = memo(StickyComponent);
