import { memo, useRef } from "react";

import { FontSizeMenuWrapper } from "./FontSizeMenuStyled";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { getFirstSelectedWithProp } from "../../../../../../controllers/utils/getFirstSelectedWithProp";
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
				data-kind="object-menu"
				data-id={`object-menu:toggle:${SECTION_ID}`}
				title="Font Size"
			>
				<FontSizeIcon />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel ref={submenuRef} placement={placement} offsetX={offsetX}>
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
