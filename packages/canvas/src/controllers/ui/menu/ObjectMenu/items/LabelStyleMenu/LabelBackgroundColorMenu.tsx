import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";
import { memo, useRef } from "react";

import { resolveLabelFill } from "../../../../../../rendering/objects/connector/ConnectorLabel";
import { togglePart } from "../../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { ColorPreviewIcon } from "../../../../icons/ColorPreviewIcon";
import { useConnectorLabelStyle } from "../../../hooks/useConnectorLabelStyle";
import { ObjectMenuColorPickerGrid } from "../../common/ObjectMenuColorPickerGrid/ObjectMenuColorPickerGrid";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
import type { ObjectMenuItemProps } from "../../ObjectMenuTypes";

const SECTION_ID = "label-bg-color";

/**
 * Label background color menu (same layout as the shape's Background Color).
 * The value is the nested `label.fill`. Omitted/auto resolves to the canvas background color (knockout).
 */
const LabelBackgroundColorMenuComponent: React.FC<ObjectMenuItemProps> = ({
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

	const { value: fill, hasLabelText } = useConnectorLabelStyle(
		"label.fill",
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
				title={messages.menuLabelBackgroundColor}
			>
				<ColorPreviewIcon
					color={resolveLabelFill(fill === AUTO_COLOR ? undefined : fill)}
					title={messages.menuLabelBackgroundColor}
				/>
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<ObjectMenuColorPickerGrid
						currentColor={fill}
						// The label of the one selected connector is the whole target.
						currentColorIsShared
						property="label.fill"
						onStyleIntent={onStyleIntent}
					/>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const LabelBackgroundColorMenu = memo(LabelBackgroundColorMenuComponent);
