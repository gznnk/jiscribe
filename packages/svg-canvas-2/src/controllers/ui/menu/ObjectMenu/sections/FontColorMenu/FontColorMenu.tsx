import { memo, useRef } from "react";

import type { CanvasState } from "../../../../../../states/canvas/CanvasState";
import { FontColorIcon } from "../../../../icons/FontColorIcon";
import { ColorPickerGrid } from "../../common/ColorPickerGrid/ColorPickerGrid";
import {
	ObjectMenuButton,
	DropdownColorPanel,
	MenuItemPositioner,
} from "../../ObjectMenuStyled";
import { useSubmenuPosition } from "../../useSubmenuPosition";

const SECTION_ID = "font-color";

type FontColorMenuProps = {
	canvasState: CanvasState;
};

/**
 * フォントカラーメニュー（見た目のみ）。
 * テキスト機能の実装後に fontColor プロパティと連携予定。
 */
const FontColorMenuComponent: React.FC<FontColorMenuProps> = ({
	canvasState,
}) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	// TODO: テキスト機能実装後に fontColor を取得する
	const currentColor = "#333333";
	const { placement } = useSubmenuPosition(menuItemRef, "fontColor", isOpen);

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
					{/* TODO: テキスト機能実装後に property="fontColor" に変更 */}
					<ColorPickerGrid currentColor={currentColor} property="fontColor" />
				</DropdownColorPanel>
			)}
		</MenuItemPositioner>
	);
};

export const FontColorMenu = memo(FontColorMenuComponent);
