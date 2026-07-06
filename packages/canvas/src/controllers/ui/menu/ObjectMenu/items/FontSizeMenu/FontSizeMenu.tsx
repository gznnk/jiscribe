import { memo, useRef } from "react";

import { FontSizeMenuWrapper } from "./FontSizeMenuStyled";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import type { TextStyleState } from "../../../../../../states/objects/base/TextStyleState";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { FontSizeIcon } from "../../../../icons/FontSizeIcon";
import { DropdownPanel } from "../../common/DropdownPanel";
import { MenuSlider } from "../../common/MenuSlider";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import { ObjectMenuButton, MenuItemPositioner } from "../../ObjectMenuStyled";
import { getFirstSelectedWithProp } from "../../utils/getFirstSelectedWithProp";

const SECTION_ID = "font-size";
const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 1;
const MAX_FONT_SIZE = 999;

type FontSizeMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

/**
 * Font size menu.
 * Changes the font size of the selected text object.
 */
const FontSizeMenuComponent: React.FC<FontSizeMenuProps> = ({
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

	const { selectedIds, objects } = canvasState;
	const obj = getFirstSelectedWithProp(selectedIds, objects, "fontSize");
	const fontSize =
		(obj as TextStyleState | undefined)?.fontSize ?? DEFAULT_FONT_SIZE;

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={`toggle:${SECTION_ID}`}
				title={messages.menuFontSize}
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
							property="fontSize"
							onPropertyUpdate={onPropertyUpdate}
						/>
					</FontSizeMenuWrapper>
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const FontSizeMenu = memo(FontSizeMenuComponent);
