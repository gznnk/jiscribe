import { memo } from "react";

import type { CanvasState } from "../../../../../../states/canvas/CanvasState";
import { ColorPreviewIcon } from "../../../../icons/ColorPreviewIcon";
import { ColorPickerGrid } from "../../common/ColorPickerGrid/ColorPickerGrid";
import {
	ObjectMenuButton,
	DropdownColorPanel,
	MenuItemPositioner,
} from "../../ObjectMenuStyled";

const SECTION_ID = "bg-color";

type BackgroundColorMenuProps = {
	canvasState: CanvasState;
};

/**
 * 選択中オブジェクトの fill 色を取得する。
 * 最初に見つかった fill 値を返す。
 */
const getSelectedFillColor = (state: CanvasState): string => {
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
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const currentColor = getSelectedFillColor(canvasState);

	return (
		<MenuItemPositioner>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="object-menu"
				data-id={`object-menu:toggle-${SECTION_ID}`}
				title="Background Color"
			>
				<ColorPreviewIcon color={currentColor} title="Background Color" />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownColorPanel>
					<ColorPickerGrid currentColor={currentColor} property="fill" />
				</DropdownColorPanel>
			)}
		</MenuItemPositioner>
	);
};

export const BackgroundColorMenu = memo(BackgroundColorMenuComponent);
