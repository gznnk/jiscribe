import { memo, useRef } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { getEffectiveSelectedIds } from "../../../../../../controllers/utils/getEffectiveSelectedIds";
import { getFirstSelectedWithProp } from "../../../../../../controllers/utils/getFirstSelectedWithProp";
import { ColorPreviewIcon } from "../../../../icons/ColorPreviewIcon";
import { ColorPickerGrid } from "../../common/ColorPickerGrid/ColorPickerGrid";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	DropdownPanel,
	MenuItemPositioner,
} from "../../ObjectMenuStyled";

const SECTION_ID = "line-color";
const SUBMENU_SIZE = { width: 240, height: 195 } as const;

type LineColorMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

const getSelectedStrokeColor = (state: CanvasControllerState): string => {
	const obj = getFirstSelectedWithProp(getEffectiveSelectedIds(state), state.objects, "stroke");
	const stroke = (obj as Record<string, unknown>)?.stroke;
	return typeof stroke === "string" ? stroke : "#374151";
};

/**
 * ライン色メニュー（polyline / connector 用）。
 * svg-canvas の LineColorMenu に合わせて塗りつぶし円アイコンを使用する。
 */
const LineColorMenuComponent: React.FC<LineColorMenuProps> = ({
	canvasState,
	onPropertyUpdate,
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
				title="Line Color"
			>
				<ColorPreviewIcon color={currentColor} title="Line Color" />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel placement={placement}>
					<ColorPickerGrid
						currentColor={currentColor}
						property="stroke"
						onPropertyUpdate={onPropertyUpdate}
					/>
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const LineColorMenu = memo(LineColorMenuComponent);
