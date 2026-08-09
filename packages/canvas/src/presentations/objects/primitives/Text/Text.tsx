import type React from "react";
import { memo, useMemo } from "react";

import { calcTextLineHitRects } from "./calcTextLineHitRects";
import { TextHitGroup, TextHitRect } from "./TextStyled";
import { BODY_TEXT_SLOT_ID } from "../../../../constants/textSlotId";
import { resolveTextObjectFont } from "../../../../states/objects/primitives/text/resolveTextObjectFont";
import type { TextState } from "../../../../states/objects/primitives/text/TextState";
import { readTextSlot } from "../../../../states/objects/types/TextSlots";
import { useCanvasTheme } from "../../../../theme/CanvasThemeContext";
import { TextOverlay } from "../../base/TextOverlay";
import type { TextEditable } from "../../base/TextOverlay";
import { createSvgTransform } from "../../utils/createSvgTransform";

const TextComponent: React.FC<TextState & TextEditable> = ({
	id,
	cx,
	cy,
	width,
	height,
	scaleX,
	scaleY,
	rotation,
	text,
	isEditing = false,
}) => {
	const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);
	const bodySlot = text?.[BODY_TEXT_SLOT_ID];
	const body = readTextSlot(text, BODY_TEXT_SLOT_ID);
	const { fontFamily: themeFontFamily } = useCanvasTheme();

	const hitRects = useMemo(
		() =>
			calcTextLineHitRects(
				body,
				resolveTextObjectFont(bodySlot ?? {}, themeFontFamily),
				{ width, height },
				bodySlot?.textAlign,
			),
		[body, bodySlot, themeFontFamily, width, height],
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
					textAlign={bodySlot.textAlign}
					verticalAlign={bodySlot.verticalAlign}
					fontColor={bodySlot.fontColor}
					fontSize={bodySlot.fontSize}
					fontFamily={bodySlot.fontFamily}
					fontWeight={bodySlot.fontWeight}
					fontStyle={bodySlot.fontStyle}
					textDecoration={bodySlot.textDecoration}
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
