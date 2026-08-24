import type { CanvasFontFamilyId } from "@jiscribe/doc/text/style/fontFamilies";
import { CANVAS_FONT_FAMILIES } from "@jiscribe/doc/text/style/fontFamilies";
import type React from "react";
import { memo, useEffect } from "react";

import {
	FontFamilyList,
	FontFamilyListOption,
} from "./ObjectMenuFontFamilyListStyled";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import type { CanvasMessages } from "../../../../../messages/CanvasMessagesTypes";

/** Readers rather than key names: not every CanvasMessages entry is a string. */
const LABEL_READERS: Record<
	CanvasFontFamilyId,
	(messages: CanvasMessages) => string
> = {
	sans: (messages) => messages.fontFamilySans,
	serif: (messages) => messages.fontFamilySerif,
	mono: (messages) => messages.fontFamilyMono,
	hand: (messages) => messages.fontFamilyHand,
};

/**
 * Fetches the faces the rows preview, so opening the menu does not draw the
 * labels in a fallback and swap them a moment later.
 *
 * The rows are the one place the shipped families are all on screen at once, and
 * `fonts.css` splits each by unicode-range — so a family nothing has drawn yet is
 * requested only when a row asks for it, i.e. as the panel paints. Starting the
 * fetch when the toggle mounts (a text shape or a connector label was selected)
 * buys the time it takes the pointer to reach the button.
 *
 * @param messages - The active message set; its labels are the glyphs to fetch, so a locale switch re-runs this
 */
export const usePreviewFonts = (messages: CanvasMessages): void => {
	useEffect(() => {
		// Absent in jsdom and in any non-browser host, where nothing is fetched.
		if (typeof document === "undefined" || !document.fonts) {
			return;
		}
		for (const font of CANVAS_FONT_FAMILIES) {
			// Only the glyphs a row draws, so a family costs the unicode-range chunk
			// its label falls in rather than the whole face. The size in the shorthand
			// is required syntax and selects nothing — family, weight and the text do.
			document.fonts
				.load(`16px ${font.stack}`, LABEL_READERS[font.id](messages))
				.catch(() => {
					// A stack the browser will not parse, or one with no @font-face
					// because the host skipped fonts.css: the row then draws in whatever
					// the stack falls back to, exactly as it would without asking.
				});
		}
	}, [messages]);
};

type ObjectMenuFontFamilyListProps = {
	/** The stack the text is drawn in now, which marks the active row; an unset family resolves to DEFAULT_FONT_FAMILY before it gets here. */
	activeFontFamily: string;
	/** Style property a row writes its stack to: `fontFamily` for a shape's text, `label.fontFamily` for a connector label. */
	property: string;
};

/**
 * The rows of the font menu: one per shipped family (CANVAS_FONT_FAMILIES),
 * each drawn in the font it selects. Shared by the shape and connector-label
 * menus, which differ only in the property they write.
 */
const ObjectMenuFontFamilyListComponent: React.FC<
	ObjectMenuFontFamilyListProps
> = ({ activeFontFamily, property }) => {
	const messages = useCanvasMessages();

	return (
		<FontFamilyList>
			{CANVAS_FONT_FAMILIES.map((font) => (
				<FontFamilyListOption
					key={font.id}
					isActive={activeFontFamily === font.stack}
					data-kind="menu"
					data-id="object-menu"
					data-part={`set:${property}:${font.stack}`}
					// The stack carries quotes and commas, which a CSS attribute
					// selector cannot match on; this is what e2e targets instead.
					data-font={font.id}
					// Per-entry value, so it cannot be an emotion style (#131).
					style={{ fontFamily: font.stack }}
				>
					{LABEL_READERS[font.id](messages)}
				</FontFamilyListOption>
			))}
		</FontFamilyList>
	);
};

export const ObjectMenuFontFamilyList = memo(ObjectMenuFontFamilyListComponent);
