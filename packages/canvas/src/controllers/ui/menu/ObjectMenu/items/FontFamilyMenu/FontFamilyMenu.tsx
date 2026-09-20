import { DEFAULT_FONT_FAMILY } from "@jiscribe/doc/text/style/fontFamilies";
import { memo, useRef } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { togglePart } from "../../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { useCanvasRegistries } from "../../../../../registries/CanvasRegistriesContext";
import { FontFamilyIcon } from "../../../../icons/FontFamilyIcon";
import { readSelectionTextStyle } from "../../../utils/readSelectionTextStyle";
import {
	isMixedSelectionValue,
	selectionValueOr,
} from "../../../utils/SelectionValue";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import {
	ObjectMenuFontFamilyList,
	usePreviewFonts,
} from "../../common/ObjectMenuFontFamilyList";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";

const SECTION_ID = "font-family";

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
	const textStyle = readSelectionTextStyle(
		canvasState,
		objectTextStyleDefaults,
	);
	// An unset family draws in the default one, so that is the entry to mark
	// active; a selection drawn in several marks none.
	const fontFamily = isMixedSelectionValue(textStyle.fontFamily)
		? undefined
		: (selectionValueOr(textStyle.fontFamily, undefined) ??
			DEFAULT_FONT_FAMILY);

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={togglePart(SECTION_ID)}
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
					<ObjectMenuFontFamilyList
						activeFontFamily={fontFamily}
						property="fontFamily"
					/>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const FontFamilyMenu = memo(FontFamilyMenuComponent);
