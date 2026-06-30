import { memo, useRef } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { getEffectiveSelectedIds } from "../../../../../../controllers/utils/getEffectiveSelectedIds";
import { resolveAutoColor } from "../../../../../../presentations/objects/utils/resolveAutoColor";
import { ColorPreviewIcon } from "../../../../icons/ColorPreviewIcon";
import { ColorPickerGrid } from "../../common/ColorPickerGrid/ColorPickerGrid";
import { DropdownPanel } from "../../common/DropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import { ObjectMenuButton, MenuItemPositioner } from "../../ObjectMenuStyled";
import { getFirstSelectedWithProp } from "../../utils/getFirstSelectedWithProp";

const SECTION_ID = "line-color";

type LineColorMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

const getSelectedStrokeColor = (state: CanvasControllerState): string => {
	const obj = getFirstSelectedWithProp(
		getEffectiveSelectedIds(state),
		state.objects,
		"stroke",
	);
	const stroke = (obj as Record<string, unknown>)?.stroke;
	return typeof stroke === "string" ? stroke : "#374151";
};

/**
 * ライン色メニュー（polyline / connector 用）。
 * 塗りつぶし円アイコンを使用する。
 */
const LineColorMenuComponent: React.FC<LineColorMenuProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const currentColor = getSelectedStrokeColor(canvasState);
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="object-menu"
				data-id={`object-menu:toggle:${SECTION_ID}`}
				title="Line Color"
			>
				<ColorPreviewIcon
					color={resolveAutoColor(currentColor, "ink")}
					title="Line Color"
				/>
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel ref={submenuRef} placement={placement} offsetX={offsetX}>
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
