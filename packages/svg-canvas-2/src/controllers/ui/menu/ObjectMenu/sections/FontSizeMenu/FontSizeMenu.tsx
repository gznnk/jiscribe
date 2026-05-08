import { memo, useRef } from "react";

import { FontSizeMenuWrapper } from "./FontSizeMenuStyled";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import type { TextStyleState } from "../../../../../../states/objects/base/TextStyleState";
import { FontSizeIcon } from "../../../../icons/FontSizeIcon";
import { MenuSlider } from "../../common/MenuSlider";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	DropdownPanel,
	MenuItemPositioner,
} from "../../ObjectMenuStyled";

const SECTION_ID = "font-size";
const DEFAULT_FONT_SIZE = 14;
const SUBMENU_SIZE = { width: 160, height: 80 } as const;
const MIN_FONT_SIZE = 1;
const MAX_FONT_SIZE = 999;

type FontSizeMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

/**
 * フォントサイズメニュー。
 * 選択中のテキストオブジェクトのフォントサイズを変更する。
 */
const FontSizeMenuComponent: React.FC<FontSizeMenuProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { placement } = useSubmenuPosition(menuItemRef, SUBMENU_SIZE, isOpen);

	// Get fontSize from the first selected object (if it has text properties)
	const { selectedIds, objects } = canvasState;
	const firstSelectedId = selectedIds[0];
	const firstSelectedObject = firstSelectedId
		? objects[firstSelectedId]
		: undefined;
	const fontSize =
		firstSelectedObject && "fontSize" in firstSelectedObject
			? ((firstSelectedObject as TextStyleState).fontSize ?? DEFAULT_FONT_SIZE)
			: DEFAULT_FONT_SIZE;

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="object-menu"
				data-id={`object-menu:toggle:${SECTION_ID}`}
				title="Font Size"
			>
				<FontSizeIcon />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel placement={placement}>
					<FontSizeMenuWrapper>
						<MenuSlider
							label="Font Size"
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
