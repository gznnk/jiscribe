import { memo, useRef } from "react";

import { getSelectedConnectorLabel } from "./utils/getSelectedConnectorLabel";
import { CONNECTOR_LABEL_DEFAULTS } from "../../../../../../presentations/objects/connections/ConnectorLabel";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { FontSizeIcon } from "../../../../icons/FontSizeIcon";
import { DropdownPanel } from "../../common/DropdownPanel";
import { MenuSlider } from "../../common/MenuSlider";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import { ObjectMenuButton, MenuItemPositioner } from "../../ObjectMenuStyled";
import { FontSizeMenuWrapper } from "../FontSizeMenu/FontSizeMenuStyled";

const SECTION_ID = "label-font-size";
const MIN_FONT_SIZE = 1;
const MAX_FONT_SIZE = 999;
// Slider covers the common typographic range; larger sizes via the number input.
const SLIDER_MIN_FONT_SIZE = 8;
const SLIDER_MAX_FONT_SIZE = 72;
const FONT_SIZE_STEP = 2;

type Props = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

/**
 * Font size menu for the label (same layout as the shape's Font Size). The value is the nested `label.fontSize`.
 */
const LabelFontSizeMenuComponent: React.FC<Props> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	const fontSize =
		getSelectedConnectorLabel(canvasState)?.fontSize ??
		CONNECTOR_LABEL_DEFAULTS.fontSize;

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={`toggle:${SECTION_ID}`}
				title={messages.menuLabelFontSize}
			>
				<FontSizeIcon />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel ref={submenuRef} placement={placement} offsetX={offsetX}>
					<FontSizeMenuWrapper>
						<MenuSlider
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
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const LabelFontSizeMenu = memo(LabelFontSizeMenuComponent);
