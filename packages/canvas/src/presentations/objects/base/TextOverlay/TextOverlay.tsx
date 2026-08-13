import type React from "react";
import { memo } from "react";

import { RichTextContent } from "./RichTextContent";
import { TextOverlayFrame } from "./TextOverlayFrame";
import type { RichText } from "../../../../schemas/objects/types/RichText";
import {
	isStyledRichText,
	richTextToPlain,
} from "../../../../schemas/objects/types/RichText";
import type { TextAlign } from "../../../../schemas/objects/types/TextAlign";
import type { VerticalAlign } from "../../../../schemas/objects/types/VerticalAlign";

export type TextEditable = {
	/** True while any slot of this object has the in-place editor open. */
	isEditing?: boolean;
	/**
	 * Which slot that editor targets, so a multi-slot shape blanks only that one
	 * and keeps drawing the rest. Omitted = the whole object counts as editing.
	 */
	editingSlotId?: string;
};

type TextOverlayProps = {
	// Position and size (relative to parent shape's center)
	x: number;
	y: number;
	width: number;
	height: number;
	// Transform (same as parent shape)
	transform: string;
	// Text style properties
	/** The slot's text; the run form when parts of it are styled on their own. */
	text?: RichText;
	textAlign?: TextAlign;
	verticalAlign?: VerticalAlign;
	fontColor?: string;
	fontSize?: number;
	fontFamily?: string;
	fontWeight?: string;
	fontStyle?: string;
	textDecoration?: string;
	// Editing state
	isEditing?: boolean;
};

const TextOverlayComponent: React.FC<TextOverlayProps> = ({
	x,
	y,
	width,
	height,
	transform,
	text,
	textAlign,
	verticalAlign,
	fontColor,
	fontSize,
	fontFamily,
	fontWeight,
	fontStyle,
	textDecoration,
	isEditing = false,
}) => {
	if (text === undefined || richTextToPlain(text) === "") {
		return null;
	}
	// The editor draws its own glyphs, so drawing here too would double them up —
	// except for a body styled per range, which a textarea cannot draw: there the
	// editor turns its own glyphs transparent and keeps only the caret, and this
	// overlay stays up as the visible text (see TextEditor's `textDrawnBehind`).
	// The draft is grafted into the state being drawn (graftTextEditDraft), so
	// what is drawn here follows every keystroke.
	if (isEditing && !isStyledRichText(text)) {
		return null;
	}

	return (
		<TextOverlayFrame
			x={x}
			y={y}
			width={width}
			height={height}
			transform={transform}
			textAlign={textAlign}
			verticalAlign={verticalAlign}
			fontColor={fontColor}
			fontSize={fontSize}
			fontFamily={fontFamily}
			fontWeight={fontWeight}
			fontStyle={fontStyle}
			textDecoration={textDecoration}
		>
			<RichTextContent text={text} />
		</TextOverlayFrame>
	);
};

/**
 * Draws a shape's text as plain text, honoring authored newlines and the
 * typography any part of it overrides (RichTextContent). Rendering a body that is
 * not plain text (Markdown, for one) is the job of the type that owns that body:
 * it passes its own renderer to `createFrameObject` and draws into the same
 * `TextOverlayFrame`.
 */
export const TextOverlay = memo(TextOverlayComponent);
