import { isString } from "@jiscribe/basic-validators";
import { CONNECTOR_LABEL_DEFAULTS } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { memo, useRef } from "react";

import { togglePart } from "../../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { useSelectionStyle } from "../../../../../style/SelectionStyleReaderContext";
import { selectionValueAs } from "../../../../../style/SelectionValue";
import { hasSelectedConnectorLabelText } from "../../../../../utils/hasSelectedConnectorLabelText";
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
	const fontFamily = selectionValueAs(
		useSelectionStyle("label.fontFamily"),
		isString,
		CONNECTOR_LABEL_DEFAULTS.fontFamily,
	);

	// Early-return only after all hooks have been called (to keep hook order stable).
	// No label text: render nothing, and the emptied section collapses via `:empty`.
	if (!hasSelectedConnectorLabelText({ objects, selection })) {
		return null;
	}

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-part={togglePart(SECTION_ID)}
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
