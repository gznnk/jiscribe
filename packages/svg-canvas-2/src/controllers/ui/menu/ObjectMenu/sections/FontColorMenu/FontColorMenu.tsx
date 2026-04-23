import { memo, useRef } from "react";

import type { CanvasState } from "../../../../../../states/canvas/CanvasState";
import type { TextStyleState } from "../../../../../../states/objects/base/TextStyleState";
import { FontColorIcon } from "../../../../icons/FontColorIcon";
import { ColorPickerGrid } from "../../common/ColorPickerGrid/ColorPickerGrid";
import {
	ObjectMenuButton,
	DropdownColorPanel,
	MenuItemPositioner,
} from "../../ObjectMenuStyled";
import { useSubmenuPosition } from "../../useSubmenuPosition";

const SECTION_ID = "font-color";
const DEFAULT_FONT_COLOR = "#333333";

type FontColorMenuProps = {
	canvasState: CanvasState;
};

/**
 * フォントカラーメニュー。
 * 選択中のテキストオブジェクトのフォントカラーを変更する。
 * ColorPickerGrid が data 属性経由でジェスチャーシステムと連携するため、
 * このコンポーネントは現在の色を取得して表示するだけ。
 */
const FontColorMenuComponent: React.FC<FontColorMenuProps> = ({
	canvasState,
}) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { placement } = useSubmenuPosition(menuItemRef, "fontColor", isOpen);

	// Get fontColor from the first selected object (if it has text properties)
	const { selectedIds, objects } = canvasState;
	const firstSelectedId = selectedIds[0];
	const firstSelectedObject = firstSelectedId
		? objects[firstSelectedId]
		: undefined;
	const currentColor =
		firstSelectedObject && "fontColor" in firstSelectedObject
			? (firstSelectedObject as TextStyleState).fontColor ?? DEFAULT_FONT_COLOR
			: DEFAULT_FONT_COLOR;

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
				<DropdownColorPanel placement={placement}>
					<ColorPickerGrid currentColor={currentColor} property="fontColor" />
				</DropdownColorPanel>
			)}
		</MenuItemPositioner>
	);
};

export const FontColorMenu = memo(FontColorMenuComponent);
