import { CONNECTOR_LABEL_DEFAULTS } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { memo, useRef } from "react";

import { toggleAction } from "../../../../../gestures/handlers/menu/utils/menuActions";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { FontSizeIcon } from "../../../../icons/FontSizeIcon";
import { useConnectorLabelStyle } from "../../../hooks/useConnectorLabelStyle";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { ObjectMenuSlider } from "../../common/ObjectMenuSlider";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
import type { ObjectMenuItemProps } from "../../ObjectMenuTypes";
import { FontSizeMenuWrapper } from "../FontSizeMenu/FontSizeMenuStyled";

const SECTION_ID = "label-font-size";
const MIN_FONT_SIZE = 1;
const MAX_FONT_SIZE = 999;
// Slider covers the common typographic range; larger sizes via the number input.
const SLIDER_MIN_FONT_SIZE = 8;
const SLIDER_MAX_FONT_SIZE = 72;
const FONT_SIZE_STEP = 2;

/**
 * Font size menu for the label (same layout as the shape's Font Size). The value is the nested `label.fontSize`.
 */
const LabelFontSizeMenuComponent: React.FC<ObjectMenuItemProps> = ({
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

	const { value: fontSize, hasLabelText } = useConnectorLabelStyle(
		"label.fontSize",
		CONNECTOR_LABEL_DEFAULTS.fontSize,
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
				title={messages.menuLabelFontSize}
			>
				<FontSizeIcon />
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<FontSizeMenuWrapper>
						<ObjectMenuSlider
							label={messages.menuFontSize}
							value={fontSize}
							min={MIN_FONT_SIZE}
							max={MAX_FONT_SIZE}
							sliderMin={SLIDER_MIN_FONT_SIZE}
							sliderMax={SLIDER_MAX_FONT_SIZE}
							step={FONT_SIZE_STEP}
							property="label.fontSize"
							onStyleIntent={onStyleIntent}
						/>
					</FontSizeMenuWrapper>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const LabelFontSizeMenu = memo(LabelFontSizeMenuComponent);
