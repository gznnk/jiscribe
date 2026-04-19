import { memo } from "react";

import type { CanvasState } from "../../../../../../states/canvas/CanvasState";
import { BorderColorIcon } from "../../../../icons/BorderColorIcon";
import { ColorPickerGrid } from "../../common/ColorPickerGrid";
import {
	ObjectMenuButton,
	DropdownColorPanel,
	MenuItemPositioner,
} from "../../ObjectMenuStyled";

const SECTION_ID = "stroke-color";

type StrokeColorMenuProps = {
	canvasState: CanvasState;
};

/**
 * 選択中オブジェクトの stroke 色を取得する。
 * 最初に見つかった stroke 値を返す。
 */
const getSelectedStrokeColor = (state: CanvasState): string => {
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
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const currentColor = getSelectedStrokeColor(canvasState);

	return (
		<MenuItemPositioner>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="object-menu"
				data-id={`object-menu:toggle-${SECTION_ID}`}
				title="Stroke Color"
			>
				<BorderColorIcon color={currentColor} title="Stroke Color" />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownColorPanel>
					<ColorPickerGrid currentColor={currentColor} property="stroke" />
				</DropdownColorPanel>
			)}
		</MenuItemPositioner>
	);
};

export const StrokeColorMenu = memo(StrokeColorMenuComponent);
