import { TEXT_STYLE_FALLBACK } from "@jiscribe/doc/text/style/textStyleFallback";
import { memo, useRef } from "react";

import { resolveAutoColor } from "../../../../../../rendering/objects/utils/resolveAutoColor";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { toggleAction } from "../../../../../gestures/handlers/menu/utils/menuActions";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import {
	isMixedSelectionValue,
	selectionMixedValues,
	selectionValueOr,
} from "../../../../../style/SelectionValue";
import { FontColorIcon } from "../../../../icons/FontColorIcon";
import { useSelectionStyle } from "../../../SelectionStyleReaderContext";
import { ObjectMenuColorPickerGrid } from "../../common/ObjectMenuColorPickerGrid/ObjectMenuColorPickerGrid";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
import type { StyleIntentUpdater } from "../../ObjectMenuTypes";

const SECTION_ID = "font-color";

type FontColorMenuProps = {
	canvasState: CanvasControllerState;
	onStyleIntent: StyleIntentUpdater;
};

/**
 * Font color menu.
 * Changes the font color of the selected text object.
 * Since ObjectMenuColorPickerGrid coordinates with the gesture system via data attributes,
 * this component only retrieves and displays the current color.
 */
const FontColorMenuComponent: React.FC<FontColorMenuProps> = ({
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

	const fontColor = useSelectionStyle("fontColor");
	const isMixed = isMixedSelectionValue(fontColor);
	const currentColor = selectionValueOr(
		fontColor,
		TEXT_STYLE_FALLBACK.fontColor,
	);

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-action={toggleAction(SECTION_ID)}
				title={messages.menuFontColor}
			>
				<FontColorIcon
					underlineColor={resolveAutoColor(currentColor, "ink")}
					mixedColors={selectionMixedValues(fontColor)?.map((mixedColor) =>
						resolveAutoColor(
							mixedColor ?? TEXT_STYLE_FALLBACK.fontColor,
							"ink",
						),
					)}
				/>
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<ObjectMenuColorPickerGrid
						currentColor={isMixed ? "" : currentColor}
						property="fontColor"
						onStyleIntent={onStyleIntent}
					/>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const FontColorMenu = memo(FontColorMenuComponent);
