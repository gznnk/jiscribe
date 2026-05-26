import { memo, useRef } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { getFirstSelectedWithProp } from "../../../../../../controllers/utils/getFirstSelectedWithProp";
import { ColorPreviewIcon } from "../../../../icons/ColorPreviewIcon";
import { ColorPickerGrid } from "../../common/ColorPickerGrid/ColorPickerGrid";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	DropdownPanel,
	MenuItemPositioner,
} from "../../ObjectMenuStyled";

const SECTION_ID = "bg-color";
const SUBMENU_SIZE = { width: 240, height: 195 } as const;

type BackgroundColorMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

const getSelectedFillColor = (state: CanvasControllerState): string => {
	const obj = getFirstSelectedWithProp(
		state.selectedIds,
		state.objects,
		"fill",
	);
	const fill = (obj as Record<string, unknown>)?.fill;
	return typeof fill === "string" ? fill : "transparent";
};

/**
 * 背景色メニュー。
 * 選択中オブジェクトの fill プロパティをカラーピッカーで変更する。
 */
const BackgroundColorMenuComponent: React.FC<BackgroundColorMenuProps> = ({
	canvasState,
	onPropertyUpdate,
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
					<ColorPickerGrid
						currentColor={currentColor}
						property="fill"
						onPropertyUpdate={onPropertyUpdate}
					/>
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const BackgroundColorMenu = memo(BackgroundColorMenuComponent);
