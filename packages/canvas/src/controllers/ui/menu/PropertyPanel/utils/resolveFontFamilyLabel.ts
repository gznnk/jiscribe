import { CANVAS_FONT_FAMILIES } from "@jiscribe/doc/text/style/fontFamilies";

import type { CanvasMessages } from "../../../../messages/CanvasMessagesTypes";

/** Readers rather than key names: not every CanvasMessages entry is a string. */
const FONT_FAMILY_LABEL_READERS: Record<
	string,
	(messages: CanvasMessages) => string
> = {
	sans: (messages) => messages.fontFamilySans,
	serif: (messages) => messages.fontFamilySerif,
	mono: (messages) => messages.fontFamilyMono,
	hand: (messages) => messages.fontFamilyHand,
};

/**
 * The name of the shipped family a stack belongs to, as the closed trigger of a
 * font dropdown states it.
 *
 * @param fontFamily - A CSS font stack as the doc holds it; one the shipped set does not name is returned as it was written, which is what the shape is drawn with
 * @param messages - The active message set, host overrides already applied
 * @returns The shipped family's own wording, or `fontFamily` unchanged
 */
export const resolveFontFamilyLabel = (
	fontFamily: string,
	messages: CanvasMessages,
): string => {
	const shipped = CANVAS_FONT_FAMILIES.find(
		(font) => font.stack === fontFamily,
	);
	return shipped === undefined
		? fontFamily
		: FONT_FAMILY_LABEL_READERS[shipped.id](messages);
};
