import { memo, useEffect, useRef } from "react";

import {
	FontFamilyMenuWrapper,
	FontFamilyOption,
} from "./FontFamilyMenuStyled";
import type { CanvasFontFamilyId } from "../../../../../../constants/fontFamilies";
import {
	CANVAS_FONT_FAMILIES,
	DEFAULT_FONT_FAMILY,
} from "../../../../../../constants/fontFamilies";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import type { CanvasMessages } from "../../../../../messages/CanvasMessagesTypes";
import { useCanvasRegistries } from "../../../../../registries/CanvasRegistriesContext";
import { FontFamilyIcon } from "../../../../icons/FontFamilyIcon";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
import { getSelectedOrFirstTextSlot } from "../../utils/getSelectedOrFirstTextSlot";

const SECTION_ID = "font-family";

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
 * fetch when the toggle mounts (a text shape was selected) buys the time it takes
 * the pointer to reach the button.
 *
 * @param messages - The active message set; its labels are the glyphs to fetch, so a locale switch re-runs this
 */
const usePreviewFonts = (messages: CanvasMessages): void => {
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

type FontFamilyMenuProps = {
	canvasState: CanvasControllerState;
};

/**
 * Font family menu.
 * Picks the font of the selected text object from the closed set the canvas
 * ships faces for (CANVAS_FONT_FAMILIES).
 */
const FontFamilyMenuComponent: React.FC<FontFamilyMenuProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();
	usePreviewFonts(messages);
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	const { objectTextStyleDefaults } = useCanvasRegistries();
	const slot = getSelectedOrFirstTextSlot(canvasState, objectTextStyleDefaults);
	// An unset family draws in the default one, so that is the entry to mark active.
	const fontFamily = slot?.fontFamily ?? DEFAULT_FONT_FAMILY;

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={`toggle:${SECTION_ID}`}
				title={messages.menuFontFamily}
			>
				<FontFamilyIcon title={messages.menuFontFamily} />
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<FontFamilyMenuWrapper>
						{CANVAS_FONT_FAMILIES.map((font) => (
							<FontFamilyOption
								key={font.id}
								isActive={fontFamily === font.stack}
								data-kind="menu"
								data-id="object-menu"
								data-part={`set:fontFamily:${font.stack}`}
								// The stack carries quotes and commas, which a CSS attribute
								// selector cannot match on; this is what e2e targets instead.
								data-font={font.id}
								// Per-entry value, so it cannot be an emotion style (#131).
								style={{ fontFamily: font.stack }}
							>
								{LABEL_READERS[font.id](messages)}
							</FontFamilyOption>
						))}
					</FontFamilyMenuWrapper>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const FontFamilyMenu = memo(FontFamilyMenuComponent);
