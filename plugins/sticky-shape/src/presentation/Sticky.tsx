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

import { StickyShadow } from "./StickyShadow";
import { StickyBody } from "./StickyStyled";
import { STICKY_DOC_DEFAULTS } from "../schema/StickyDoc";
import type { StickyState } from "../state/StickyState";

type StickyProps = StickyState & TextEditable;

/**
 * Drawn by hand rather than through `createFrameObject`: the paper sits over a
 * drop shadow, so the type owns a group of its own instead of the single styled
 * shape that helper draws. Everything that helper resolves has to
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

	// A document may leave `fill` out (parsing resolves nothing; only the editor's
	// factory copies the defaults in), and the paper is yellow rather than the
	// shared "transparent" that resolveAutoColor would otherwise fall back to —
	// so the schema constant is the fallback, keeping one source for the default.
	const fillColor = resolveAutoColor(fill, "surface", STICKY_DOC_DEFAULTS.fill);

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

	return (
		<g data-kind="object" data-id={id} style={{ cursor: "grab" }}>
			<StickyShadow width={width} height={height} transform={transformAttr} />
			{/* Main sticky note */}
			<StickyBody
				points={points}
				fillColor={fillColor}
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
