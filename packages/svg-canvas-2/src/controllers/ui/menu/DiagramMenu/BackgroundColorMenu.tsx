import { memo } from "react";

import { ColorPickerGrid } from "./components/ColorPickerGrid";
import {
	DiagramMenuButton,
	DropdownColorPanel,
	MenuItemPositioner,
} from "./DiagramMenuStyled";
import type { CanvasState } from "../../../../states/canvas/CanvasState";
import { ColorPreviewIcon } from "../../icons/ColorPreviewIcon";

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
	const isOpen = canvasState.diagramMenuOpenId === SECTION_ID;
	const currentColor = getSelectedFillColor(canvasState);

	return (
		<MenuItemPositioner>
			<DiagramMenuButton
				isActive={isOpen}
				data-kind="diagram-menu"
				data-id={`diagram-menu:toggle-${SECTION_ID}`}
				title="Background Color"
			>
				<ColorPreviewIcon color={currentColor} title="Background Color" />
			</DiagramMenuButton>
			{isOpen && (
				<DropdownColorPanel>
					<ColorPickerGrid currentColor={currentColor} property="fill" />
				</DropdownColorPanel>
			)}
		</MenuItemPositioner>
	);
};

export const BackgroundColorMenu = memo(BackgroundColorMenuComponent);
