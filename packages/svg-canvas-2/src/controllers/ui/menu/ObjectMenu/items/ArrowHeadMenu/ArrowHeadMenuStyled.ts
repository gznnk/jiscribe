import styled from "@emotion/styled";

import { theme } from "../../../../../../constants/theme";

/**
 * 矢印セレクター グリッド（3列）。
 * DropdownPanel 内に配置する。
 */
export const ArrowSelectorGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 4px;
	padding: 8px;
`;

/**
 * 矢印タイプ選択ボタン。
 * SVGプレビューを表示する。
 */
export const ArrowTypeButton = styled.button<{ isActive?: boolean }>`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	padding: 2px;
	border: 1px solid ${(p) => (p.isActive ? theme.accent : "transparent")};
	border-radius: ${theme.radius};
	background: ${(p) => (p.isActive ? theme.surfaceActive : "transparent")};
	cursor: pointer;
	color: ${theme.foreground};
	transition: all 0.15s;

	&:hover {
		background: ${theme.surfaceHover};
		border-color: ${theme.border};
	}
`;
