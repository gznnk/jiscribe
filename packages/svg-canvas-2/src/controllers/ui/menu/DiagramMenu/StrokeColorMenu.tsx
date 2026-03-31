import { memo } from "react";

import { ColorPickerGrid } from "./components/ColorPickerGrid";
import {
	DiagramMenuButton,
	DropdownColorPanel,
	MenuItemPositioner,
} from "./DiagramMenuStyled";
import type { CanvasState } from "../../../../states/canvas/CanvasState";
import { ColorPreviewIcon } from "../../icons/ColorPreviewIcon";

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
	const isOpen = canvasState.diagramMenuOpenId === SECTION_ID;
	const currentColor = getSelectedStrokeColor(canvasState);

	return (
		<MenuItemPositioner>
			<DiagramMenuButton
				isActive={isOpen}
				data-kind="diagram-menu"
				data-id={`diagram-menu:toggle-${SECTION_ID}`}
				title="Stroke Color"
			>
				<ColorPreviewIcon color={currentColor} title="Stroke Color" />
			</DiagramMenuButton>
			{isOpen && (
				<DropdownColorPanel>
					<ColorPickerGrid currentColor={currentColor} property="stroke" />
				</DropdownColorPanel>
			)}
		</MenuItemPositioner>
	);
};

export const StrokeColorMenu = memo(StrokeColorMenuComponent);
