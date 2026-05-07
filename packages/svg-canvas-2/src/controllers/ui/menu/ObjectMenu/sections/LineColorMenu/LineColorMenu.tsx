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

const SECTION_ID = "line-color";

type LineColorMenuProps = {
	canvasState: CanvasControllerState;
};

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
 * ライン色メニュー（polyline / connector 用）。
 * svg-canvas の LineColorMenu に合わせて塗りつぶし円アイコンを使用する。
 */
const LineColorMenuComponent: React.FC<LineColorMenuProps> = ({
	canvasState,
}) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const currentColor = getSelectedStrokeColor(canvasState);
	const { placement } = useSubmenuPosition(menuItemRef, "strokeColor", isOpen);

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="object-menu"
				data-id={`object-menu:toggle:${SECTION_ID}`}
				title="Line Color"
			>
				<ColorPreviewIcon color={currentColor} title="Line Color" />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel placement={placement}>
					<ColorPickerGrid currentColor={currentColor} property="stroke" />
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const LineColorMenu = memo(LineColorMenuComponent);
