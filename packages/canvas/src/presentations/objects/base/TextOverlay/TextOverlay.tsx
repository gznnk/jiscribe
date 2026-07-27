import type React from "react";
import { memo } from "react";

import { TextOverlayFrame } from "./TextOverlayFrame";
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
	text?: string;
	textAlign?: TextAlign;
	verticalAlign?: VerticalAlign;
	fontColor?: string;
	fontSize?: number;
	fontFamily?: string;
	fontWeight?: string;
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
	isEditing = false,
}) => {
	// Don't render anything if editing or text is empty
	if (isEditing || !text) {
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
		>
			{text}
		</TextOverlayFrame>
	);
};

/**
 * Draws a shape's text as plain text, honoring authored newlines. Rendering a
 * body that is not plain text (Markdown, for one) is the job of the type that
 * owns that body: it passes its own renderer to `createFrameObject` and draws
 * into the same `TextOverlayFrame`.
 */
export const TextOverlay = memo(TextOverlayComponent);
