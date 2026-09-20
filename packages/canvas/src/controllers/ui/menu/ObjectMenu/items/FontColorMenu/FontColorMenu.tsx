import { TEXT_STYLE_FALLBACK } from "@jiscribe/doc/text/style/textStyleFallback";
import { memo, useRef } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { resolveAutoColor } from "../../../../../../rendering/objects/utils/resolveAutoColor";
import { togglePart } from "../../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { useCanvasRegistries } from "../../../../../registries/CanvasRegistriesContext";
import { FontColorIcon } from "../../../../icons/FontColorIcon";
import { readSelectionTextStyle } from "../../../utils/readSelectionTextStyle";
import {
	isMixedSelectionValue,
	selectionMixedValues,
	selectionValueOr,
} from "../../../utils/SelectionValue";
import { ObjectMenuColorPickerGrid } from "../../common/ObjectMenuColorPickerGrid/ObjectMenuColorPickerGrid";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
import type { StylePropertyUpdater } from "../../ObjectMenuTypes";

const SECTION_ID = "font-color";

type FontColorMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: StylePropertyUpdater;
};

/**
 * Font color menu.
 * Changes the font color of the selected text object.
 * Since ObjectMenuColorPickerGrid coordinates with the gesture system via data attributes,
 * this component only retrieves and displays the current color.
 */
const FontColorMenuComponent: React.FC<FontColorMenuProps> = ({
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

	const { objectTextStyleDefaults } = useCanvasRegistries();
	const { fontColor } = readSelectionTextStyle(
		canvasState,
		objectTextStyleDefaults,
	);
	const isMixed = isMixedSelectionValue(fontColor);
	const currentColor =
		selectionValueOr(fontColor, undefined) ?? TEXT_STYLE_FALLBACK.fontColor;

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={togglePart(SECTION_ID)}
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
						onPropertyUpdate={onPropertyUpdate}
					/>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const FontColorMenu = memo(FontColorMenuComponent);
