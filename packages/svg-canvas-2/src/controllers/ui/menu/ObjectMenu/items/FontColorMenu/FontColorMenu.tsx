import { memo, useRef } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { getFirstSelectedWithProp } from "../../../../../../controllers/utils/getFirstSelectedWithProp";
import type { TextStyleState } from "../../../../../../states/objects/base/TextStyleState";
import { FontColorIcon } from "../../../../icons/FontColorIcon";
import { ColorPickerGrid } from "../../common/ColorPickerGrid/ColorPickerGrid";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	DropdownPanel,
	MenuItemPositioner,
} from "../../ObjectMenuStyled";

const SECTION_ID = "font-color";
const DEFAULT_FONT_COLOR = "#333333";

type FontColorMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

/**
 * フォントカラーメニュー。
 * 選択中のテキストオブジェクトのフォントカラーを変更する。
 * ColorPickerGrid が data 属性経由でジェスチャーシステムと連携するため、
 * このコンポーネントは現在の色を取得して表示するだけ。
 */
const FontColorMenuComponent: React.FC<FontColorMenuProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	const { selectedIds, objects } = canvasState;
	const obj = getFirstSelectedWithProp(selectedIds, objects, "fontColor");
	const currentColor =
		(obj as TextStyleState | undefined)?.fontColor ?? DEFAULT_FONT_COLOR;

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="object-menu"
				data-id={`object-menu:toggle:${SECTION_ID}`}
				title="Font Color"
			>
				<FontColorIcon underlineColor={currentColor} />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel ref={submenuRef} placement={placement} offsetX={offsetX}>
					<ColorPickerGrid
						currentColor={currentColor}
						property="fontColor"
						onPropertyUpdate={onPropertyUpdate}
					/>
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const FontColorMenu = memo(FontColorMenuComponent);
