import { memo, useRef } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { resolveAutoColor } from "../../../../../../presentations/objects/utils/resolveAutoColor";
import type { TextStyleState } from "../../../../../../states/objects/base/TextStyleState";
import { FontColorIcon } from "../../../../icons/FontColorIcon";
import { ColorPickerGrid } from "../../common/ColorPickerGrid/ColorPickerGrid";
import { DropdownPanel } from "../../common/DropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import { ObjectMenuButton, MenuItemPositioner } from "../../ObjectMenuStyled";
import { getFirstSelectedWithProp } from "../../utils/getFirstSelectedWithProp";

const SECTION_ID = "font-color";
const DEFAULT_FONT_COLOR = "#333333";

type FontColorMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

/**
 * Font color menu.
 * Changes the font color of the selected text object.
 * Since ColorPickerGrid coordinates with the gesture system via data attributes,
 * this component only retrieves and displays the current color.
 */
const FontColorMenuComponent: React.FC<FontColorMenuProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	const { selectedIds, objects } = canvasState;
	const obj = getFirstSelectedWithProp(selectedIds, objects, "fontColor");
	const currentColor =
		(obj as TextStyleState | undefined)?.fontColor ?? DEFAULT_FONT_COLOR;

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="object-menu"
				data-id={`object-menu:toggle:${SECTION_ID}`}
				title="Font Color"
			>
				<FontColorIcon underlineColor={resolveAutoColor(currentColor, "ink")} />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel ref={submenuRef} placement={placement} offsetX={offsetX}>
					<ColorPickerGrid
						currentColor={currentColor}
						property="fontColor"
						onPropertyUpdate={onPropertyUpdate}
					/>
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const FontColorMenu = memo(FontColorMenuComponent);
