import { memo, useRef } from "react";

import { getSelectedConnectorLabel } from "./utils/getSelectedConnectorLabel";
import { CONNECTOR_LABEL_DEFAULTS } from "../../../../../../rendering/objects/connector/ConnectorLabel";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { FontFamilyIcon } from "../../../../icons/FontFamilyIcon";
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
	selectedConnectorId,
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

	const label = getSelectedConnectorLabel(selectedConnectorId, objects);

	// Early-return only after all hooks have been called (to keep hook order stable).
	// No label text: render nothing, and the emptied section collapses via `:empty`.
	if (!label?.text) {
		return null;
	}

	// An unset family draws in the default one, so that is the entry to mark active.
	const fontFamily = label.fontFamily ?? CONNECTOR_LABEL_DEFAULTS.fontFamily;

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={`toggle:${SECTION_ID}`}
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
