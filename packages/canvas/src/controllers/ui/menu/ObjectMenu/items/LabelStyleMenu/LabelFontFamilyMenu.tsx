import { CONNECTOR_LABEL_DEFAULTS } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { memo, useRef } from "react";

import { toggleAction } from "../../../../../gestures/handlers/menu/utils/menuActions";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { FontFamilyIcon } from "../../../../icons/FontFamilyIcon";
import { useConnectorLabelStyle } from "../../../hooks/useConnectorLabelStyle";
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
import type { ObjectMenuItemProps } from "../../ObjectMenuTypes";

const SECTION_ID = "label-font-family";

/**
 * Font family menu for the label (the same rows as the shape's Font, drawn from
 * CANVAS_FONT_FAMILIES). The value is the nested `label.fontFamily`.
 */
const LabelFontFamilyMenuComponent: React.FC<ObjectMenuItemProps> = ({
	objects,
	selection,
	openSectionId,
}) => {
	const messages = useCanvasMessages();
	usePreviewFonts(messages);
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = openSectionId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	// An unset family draws in the default one, so that is the entry to mark active.
	const { value: fontFamily, hasLabelText } = useConnectorLabelStyle(
		"label.fontFamily",
		CONNECTOR_LABEL_DEFAULTS.fontFamily,
		{ objects, selection },
	);

	// No label text: render nothing, and the emptied section collapses via `:empty`.
	if (!hasLabelText) {
		return null;
	}

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-action={toggleAction(SECTION_ID)}
				title={messages.menuLabelFontFamily}
			>
				<FontFamilyIcon title={messages.menuLabelFontFamily} />
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<ObjectMenuFontFamilyList
						activeFontFamily={fontFamily}
						property="label.fontFamily"
					/>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const LabelFontFamilyMenu = memo(LabelFontFamilyMenuComponent);
