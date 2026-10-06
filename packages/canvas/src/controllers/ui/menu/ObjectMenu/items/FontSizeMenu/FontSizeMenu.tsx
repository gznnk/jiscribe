import { TEXT_STYLE_FALLBACK } from "@jiscribe/doc/text/style/textStyleFallback";
import { memo, useRef } from "react";

import { FontSizeMenuWrapper } from "./FontSizeMenuStyled";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { togglePart } from "../../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { useCanvasRegistries } from "../../../../../registries/CanvasRegistriesContext";
import { readSelectionStyle } from "../../../../../style/readSelectionStyle";
import {
	isMixedSelectionValue,
	selectionValueOrFirst,
} from "../../../../../style/SelectionValue";
import { FontSizeIcon } from "../../../../icons/FontSizeIcon";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { ObjectMenuSlider } from "../../common/ObjectMenuSlider";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
import type { StyleIntentUpdater } from "../../ObjectMenuTypes";

const SECTION_ID = "font-size";
const MIN_FONT_SIZE = 1;
const MAX_FONT_SIZE = 999;
// Slider covers the common typographic range; larger sizes via the number input.
const SLIDER_MIN_FONT_SIZE = 8;
const SLIDER_MAX_FONT_SIZE = 72;
const FONT_SIZE_STEP = 2;

type FontSizeMenuProps = {
	canvasState: CanvasControllerState;
	onStyleIntent: StyleIntentUpdater;
};

/**
 * Font size menu.
 * Changes the font size of the selected text object.
 */
const FontSizeMenuComponent: React.FC<FontSizeMenuProps> = ({
	canvasState,
	onStyleIntent,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	const registries = useCanvasRegistries();
	const fontSize = readSelectionStyle(canvasState, "fontSize", registries);

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-part={togglePart(SECTION_ID)}
				title={messages.menuFontSize}
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
							value={
								selectionValueOrFirst(fontSize, undefined) ??
								TEXT_STYLE_FALLBACK.fontSize
							}
							isMixed={isMixedSelectionValue(fontSize)}
							min={MIN_FONT_SIZE}
							max={MAX_FONT_SIZE}
							sliderMin={SLIDER_MIN_FONT_SIZE}
							sliderMax={SLIDER_MAX_FONT_SIZE}
							step={FONT_SIZE_STEP}
							property="fontSize"
							onStyleIntent={onStyleIntent}
						/>
					</FontSizeMenuWrapper>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const FontSizeMenu = memo(FontSizeMenuComponent);
