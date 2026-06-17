import styled from "@emotion/styled";

import { theme } from "../../../../constants/theme";

/**
 * 上部に張り付く全幅の統合ツールバーのコンテナ。
 * 左に図形ツール、右にズーム表示・ヘルプを配置する。
 */
export const ToolbarContainer = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 40px;
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 0 8px;
	gap: 4px;
	background-color: ${theme.surface};
	border-bottom: 1px solid ${theme.border};
	box-shadow: ${theme.shadow};
	pointer-events: auto;
	user-select: none;
`;

/**
 * ツールバー内のボタングループ（左寄せ / 右寄せ）。
 */
export const ToolbarGroup = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 4px;
`;

/**
 * ツールバー内の縦区切り線。
 */
export const ToolbarDivider = styled.div`
	width: 1px;
	height: 20px;
	margin: 0 4px;
	background-color: ${theme.borderSubtle};
	align-self: center;
`;

/**
 * ツールバーのアイコンボタン（ズーム・ヘルプ用）。
 */
export const ToolbarIconButton = styled.button`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	padding: 0;
	border: 1px solid transparent;
	border-radius: ${theme.radius};
	background: transparent;
	color: ${theme.iconForeground};
	font-size: 18px;
	line-height: 1;
	cursor: pointer;
	transition: background-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:hover {
		background-color: ${theme.surfaceHover};
	}

	&:active {
		background-color: ${theme.surfaceActive};
	}

	&:disabled {
		color: ${theme.disabledForeground};
		cursor: default;
	}

	&:disabled:hover,
	&:disabled:active {
		background-color: transparent;
	}

	svg {
		color: ${theme.iconForeground};
	}
`;

/**
 * ズーム率の表示。
 */
export const ZoomReadout = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	height: 32px;
	min-width: 44px;
	padding: 0 4px;
	font-size: 11px;
	font-weight: 500;
	line-height: 1;
	text-align: center;
	color: ${theme.foregroundMuted};
	user-select: none;
`;
