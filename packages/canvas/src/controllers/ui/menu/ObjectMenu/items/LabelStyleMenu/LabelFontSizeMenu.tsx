import { isNumber } from "@jiscribe/basic-validators";
import { CONNECTOR_LABEL_DEFAULTS } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { memo, useRef } from "react";

import { togglePart } from "../../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { useSelectionStyle } from "../../../../../style/SelectionStyleReaderContext";
import { hasSelectedConnectorLabelText } from "../../../../../utils/hasSelectedConnectorLabelText";
import { FontSizeIcon } from "../../../../icons/FontSizeIcon";
import { selectionValueAs } from "../../../utils/SelectionValue";
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
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = openSectionId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	const fontSize = selectionValueAs(
		useSelectionStyle("label.fontSize"),
		isNumber,
		CONNECTOR_LABEL_DEFAULTS.fontSize,
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
							onPropertyUpdate={onPropertyUpdate}
						/>
					</FontSizeMenuWrapper>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const LabelFontSizeMenu = memo(LabelFontSizeMenuComponent);
