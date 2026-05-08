import { memo, useRef } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { ColorPreviewIcon } from "../../../../icons/ColorPreviewIcon";
import { ColorPickerGrid } from "../../common/ColorPickerGrid/ColorPickerGrid";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	DropdownPanel,
	MenuItemPositioner,
} from "../../ObjectMenuStyled";

const SECTION_ID = "bg-color";
const SUBMENU_SIZE = { width: 240, height: 140 } as const;

type BackgroundColorMenuProps = {
	canvasState: CanvasControllerState;
};

/**
 * 選択中オブジェクトの fill 色を取得する。
 * 最初に見つかった fill 値を返す。
 */
const getSelectedFillColor = (state: CanvasControllerState): string => {
	for (const id of state.selectedIds) {
		const obj = state.objects[id];
		if (obj && "fill" in obj && typeof obj.fill === "string") {
			return obj.fill;
		}
	}
	return "transparent";
};

/**
 * 背景色メニュー。
 * 選択中オブジェクトの fill プロパティをカラーピッカーで変更する。
 */
const BackgroundColorMenuComponent: React.FC<BackgroundColorMenuProps> = ({
	canvasState,
}) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const currentColor = getSelectedFillColor(canvasState);
	const { placement } = useSubmenuPosition(menuItemRef, SUBMENU_SIZE, isOpen);

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="object-menu"
				data-id={`object-menu:toggle:${SECTION_ID}`}
				title="Background Color"
			>
				<ColorPreviewIcon color={currentColor} title="Background Color" />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel placement={placement}>
					<ColorPickerGrid currentColor={currentColor} property="fill" />
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const BackgroundColorMenu = memo(BackgroundColorMenuComponent);
