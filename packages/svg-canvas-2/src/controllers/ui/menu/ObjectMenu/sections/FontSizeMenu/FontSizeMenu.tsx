import { memo } from "react";

import {
	NumberDisplay,
	SliderContainer,
	SliderInput,
	SliderLabel,
	SliderRow,
} from "./FontSizeMenuStyled";
import type { CanvasState } from "../../../../../../states/canvas/CanvasState";
import { FontSizeIcon } from "../../../../icons/FontSizeIcon";
import {
	ObjectMenuButton,
	DropdownPanel,
	MenuItemPositioner,
} from "../../ObjectMenuStyled";

const SECTION_ID = "font-size";

type FontSizeMenuProps = {
	canvasState: CanvasState;
};

/**
 * フォントサイズメニュー（見た目のみ）。
 * テキスト機能の実装後に fontSize プロパティと連携予定。
 */
const FontSizeMenuComponent: React.FC<FontSizeMenuProps> = ({
	canvasState,
}) => {
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	// TODO: テキスト機能実装後に fontSize を取得
	const _currentSize = 14;

	return (
		<MenuItemPositioner>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="object-menu"
				data-id={`object-menu:toggle:${SECTION_ID}`}
				title="Font Size"
			>
				<FontSizeIcon />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel style={{ flexDirection: "column" }}>
					<SliderContainer>
						<SliderLabel>Font Size</SliderLabel>
						<SliderRow>
							<SliderInput
								type="range"
								min={1}
								max={999}
								value={_currentSize}
								readOnly
							/>
							<NumberDisplay>{_currentSize}</NumberDisplay>
						</SliderRow>
					</SliderContainer>
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const FontSizeMenu = memo(FontSizeMenuComponent);
