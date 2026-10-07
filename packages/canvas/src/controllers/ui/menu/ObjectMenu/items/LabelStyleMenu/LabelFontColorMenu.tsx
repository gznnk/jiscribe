import { isString } from "@jiscribe/basic-validators";
import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";
import { memo, useRef } from "react";

import { resolveAutoColor } from "../../../../../../rendering/objects/utils/resolveAutoColor";
import { togglePart } from "../../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { useSelectionStyle } from "../../../../../style/SelectionStyleReaderContext";
import { selectionValueAs } from "../../../../../style/SelectionValue";
import { hasSelectedConnectorLabelText } from "../../../../../utils/hasSelectedConnectorLabelText";
import { FontColorIcon } from "../../../../icons/FontColorIcon";
import { ObjectMenuColorPickerGrid } from "../../common/ObjectMenuColorPickerGrid/ObjectMenuColorPickerGrid";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
import type { ObjectMenuItemProps } from "../../ObjectMenuTypes";

const SECTION_ID = "label-font-color";

/**
 * Font color menu for the label (same layout as the shape's Font Color). The value is the nested `label.fontColor`.
 */
const LabelFontColorMenuComponent: React.FC<ObjectMenuItemProps> = ({
	objects,
	selection,
	openSectionId,
	onStyleIntent,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = openSectionId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	const fontColor = selectionValueAs(
		useSelectionStyle("label.fontColor"),
		isString,
		AUTO_COLOR,
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
				title={messages.menuLabelFontColor}
			>
				<FontColorIcon underlineColor={resolveAutoColor(fontColor, "ink")} />
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<ObjectMenuColorPickerGrid
						currentColor={fontColor}
						property="label.fontColor"
						onStyleIntent={onStyleIntent}
					/>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const LabelFontColorMenu = memo(LabelFontColorMenuComponent);
