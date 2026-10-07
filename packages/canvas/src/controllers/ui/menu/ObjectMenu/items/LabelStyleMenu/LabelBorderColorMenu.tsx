import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";
import { memo, useRef } from "react";

import { resolveAutoColor } from "../../../../../../rendering/objects/utils/resolveAutoColor";
import { togglePart } from "../../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { BorderColorIcon } from "../../../../icons/BorderColorIcon";
import { useConnectorLabelStyle } from "../../../hooks/useConnectorLabelStyle";
import { ObjectMenuColorPickerGrid } from "../../common/ObjectMenuColorPickerGrid/ObjectMenuColorPickerGrid";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
import type { ObjectMenuItemProps } from "../../ObjectMenuTypes";

const SECTION_ID = "label-border-color";

/**
 * Label border color menu (same layout as the shape's Border Color).
 * The value is the nested `label.stroke`. The border is only visible when `label.strokeWidth > 0`.
 */
const LabelBorderColorMenuComponent: React.FC<ObjectMenuItemProps> = ({
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

	const { value: stroke, hasLabelText } = useConnectorLabelStyle(
		"label.stroke",
		AUTO_COLOR,
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
				data-part={togglePart(SECTION_ID)}
				title={messages.menuLabelBorderColor}
			>
				<BorderColorIcon
					color={resolveAutoColor(stroke, "ink")}
					title={messages.menuLabelBorderColor}
				/>
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<ObjectMenuColorPickerGrid
						currentColor={stroke}
						// The label of the one selected connector is the whole target.
						currentColorIsShared
						property="label.stroke"
						onStyleIntent={onStyleIntent}
					/>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const LabelBorderColorMenu = memo(LabelBorderColorMenuComponent);
