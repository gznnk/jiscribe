import { memo, useRef } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { BorderColorIcon } from "../../../../icons/BorderColorIcon";
import { ColorPickerGrid } from "../../common/ColorPickerGrid/ColorPickerGrid";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	DropdownPanel,
	MenuItemPositioner,
} from "../../ObjectMenuStyled";

const SECTION_ID = "stroke-color";
const SUBMENU_SIZE = { width: 240, height: 140 } as const;

type StrokeColorMenuProps = {
	canvasState: CanvasControllerState;
};

/**
 * 選択中オブジェクトの stroke 色を取得する。
 * 最初に見つかった stroke 値を返す。
 */
const getSelectedStrokeColor = (state: CanvasControllerState): string => {
	for (const id of state.selectedIds) {
		const obj = state.objects[id];
		if (obj && "stroke" in obj && typeof obj.stroke === "string") {
			return obj.stroke;
		}
	}
	return "#374151";
};

/**
 * ストローク色メニュー。
 * 選択中オブジェクトの stroke プロパティをカラーピッカーで変更する。
 * BorderColor と LineColor の両方を統合したメニュー。
 */
const StrokeColorMenuComponent: React.FC<StrokeColorMenuProps> = ({
	canvasState,
}) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const currentColor = getSelectedStrokeColor(canvasState);
	const { placement } = useSubmenuPosition(menuItemRef, SUBMENU_SIZE, isOpen);

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="object-menu"
				data-id={`object-menu:toggle:${SECTION_ID}`}
				title="Stroke Color"
			>
				<BorderColorIcon color={currentColor} title="Stroke Color" />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel placement={placement}>
					<ColorPickerGrid currentColor={currentColor} property="stroke" />
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const StrokeColorMenu = memo(StrokeColorMenuComponent);
