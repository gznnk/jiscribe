import { TEXT_BOX_PADDING_X } from "@jiscribe/doc/text/block/textBoxPadding";
import { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/text/style/textSlotId";
import type React from "react";
import { memo, useMemo } from "react";

import { calcTextLineHitRects } from "./calcTextLineHitRects";
import { TextHitGroup, TextHitRect } from "./TextStyled";
import { resolveTextObjectFont } from "../../../../states/objects/primitives/text/resolveTextObjectFont";
import type { TextState } from "../../../../states/objects/primitives/text/TextState";
import { readRichTextSlot } from "../../../../states/objects/types/TextSlots";
import { TextOverlay } from "../../base/TextOverlay";
import type { TextEditable } from "../../base/TextOverlay";
import { useFontsLoadedNonceContext } from "../../FontsLoadedNonceContext";
import { useObjectTextStyleDefaultsRegistry } from "../../registry/ObjectTextStyleDefaultsRegistryContext";
import { createSvgTransform } from "../../utils/createSvgTransform";

const TextComponent: React.FC<TextState & TextEditable> = ({
	id,
	type,
	cx,
	cy,
	width,
	height,
	scaleX,
	scaleY,
	rotation,
	text,
	textLayout,
	isEditing = false,
}) => {
	const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);
	const bodySlot = text?.[BODY_TEXT_SLOT_ID];
	const body = readRichTextSlot(text, BODY_TEXT_SLOT_ID);
	// The type's own defaults stand in for whatever the slot leaves unset, the
	// same resolution the editing surface and the reducer's re-measure make.
	const textStyleDefaults = useObjectTextStyleDefaultsRegistry();
	const style = useMemo(
		() => textStyleDefaults.resolveSlotStyle(type, BODY_TEXT_SLOT_ID, bodySlot),
		[textStyleDefaults, type, bodySlot],
	);

	// An invalidation signal, not an argument: the bands were measured against
	// whatever face was loaded at the time, so a later arrival has to re-run this
	// even though nothing the callback reads has changed.
	const fontsLoadedNonce = useFontsLoadedNonceContext();
	const hitRects = useMemo(
		() =>
			calcTextLineHitRects(
				body,
				resolveTextObjectFont(style),
				{ width, height },
				style.textAlign,
				// A block text wraps in its stored width, so the bands have to follow
				// the drawn lines rather than the authored ones.
				textLayout === "block" ? width - TEXT_BOX_PADDING_X * 2 : undefined,
			),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[body, style, width, height, textLayout, fontsLoadedNonce],
	);

	return (
		<>
			<TextHitGroup
				data-kind="object"
				data-id={id}
				data-canvas-export="exclude"
				transform={transformAttr}
			>
				{hitRects.map((hitRect, lineIndex) => (
					<TextHitRect
						// The bands come from the lines of one text, so the line's position
						// in it is the only identity they have.
						key={lineIndex}
						x={hitRect.x}
						y={hitRect.y}
						width={hitRect.width}
						height={hitRect.height}
					/>
				))}
			</TextHitGroup>
			{bodySlot !== undefined && (
				<TextOverlay
					x={-width / 2}
					y={-height / 2}
					width={width}
					height={height}
					transform={transformAttr}
					text={body}
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
			)}
		</>
	);
};

/**
 * Renders a bare text object: the shared text overlay and nothing else, since
 * the type draws no shape around it. The box is exactly the text's own extent,
 * so the overlay takes the full frame and needs no region calculator.
 *
 * The object is picked through one hit band per line rather than one rectangle
 * over the box, so the blank right side of a short line stays pass-through. The
 * bands are children of the single `[data-kind]` group, which is what the
 * gesture layer resolves a target to (see getGestureTarget).
 *
 * `editingSlotId` is ignored: the type has a single slot, so an open editor can
 * only be over that one.
 */
export const Text = memo(TextComponent);
