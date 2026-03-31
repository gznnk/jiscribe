import styled from "@emotion/styled";
import { memo } from "react";

import {
	DiagramMenuButton,
	DropdownPanel,
	MenuItemPositioner,
} from "./DiagramMenuStyled";
import type { CanvasState } from "../../../../states/canvas/CanvasState";
import { FontSizeIcon } from "../../icons/FontSizeIcon";

const SECTION_ID = "font-size";

type FontSizeMenuProps = {
	canvasState: CanvasState;
};

const SliderContainer = styled.div`
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 8px;
	min-width: 160px;
`;

const SliderLabel = styled.div`
	font-size: 11px;
	font-weight: 600;
	color: #374151;
	user-select: none;
`;

const SliderRow = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
`;

const SliderInput = styled.input`
	flex: 1;
	height: 2px;
	-webkit-appearance: none;
	appearance: none;
	background: #d1d5db;
	border-radius: 1px;
	outline: none;
	cursor: pointer;

	&::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		background: white;
		border: 2px solid #333;
		border-radius: 50%;
		cursor: pointer;
	}
`;

const NumberDisplay = styled.div`
	min-width: 28px;
	height: 22px;
	padding: 2px 4px;
	text-align: center;
	border: 1px solid #e5e7eb;
	border-radius: 4px;
	font-size: 11px;
	color: #374151;
	line-height: 18px;
`;

/**
 * フォントサイズメニュー（見た目のみ）。
 * テキスト機能の実装後に fontSize プロパティと連携予定。
 */
const FontSizeMenuComponent: React.FC<FontSizeMenuProps> = ({
	canvasState,
}) => {
	const isOpen = canvasState.diagramMenuOpenId === SECTION_ID;
	// TODO: テキスト機能実装後に fontSize を取得
	const _currentSize = 14;

	return (
		<MenuItemPositioner>
			<DiagramMenuButton
				isActive={isOpen}
				data-kind="diagram-menu"
				data-id={`diagram-menu:toggle-${SECTION_ID}`}
				title="Font Size"
			>
				<FontSizeIcon />
			</DiagramMenuButton>
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
