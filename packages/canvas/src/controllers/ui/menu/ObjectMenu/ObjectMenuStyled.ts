import styled from "@emotion/styled";

import { theme } from "../../../../constants/theme";

/**
 * ObjectMenu の外枠コンテナ。
 * ScrollSyncedOverlay 内でキャンバス座標に配置される。
 */
export const ObjectMenuWrapper = styled.div<{ left: number; top: number }>`
	position: absolute;
	left: ${(props) => props.left}px;
	top: ${(props) => props.top}px;
	pointer-events: auto;
	display: flex;
	align-items: center;
`;

/**
 * ObjectMenu の内部コンテナ（影付き）。
 */
export const ObjectMenuContainer = styled.div`
	height: 40px;
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	align-items: center;
	font-size: 14px;
	padding: 4px 8px;
	background-color: ${theme.surface};
	border: 1px solid ${theme.border};
	border-radius: ${theme.radius};
	box-shadow: ${theme.shadow};
	pointer-events: auto;
	user-select: none;
`;

/**
 * メニュー内の区切り線。
 */
export const ObjectMenuDivider = styled.div`
	width: 1px;
	height: 16px;
	margin: 0 8px;
	background-color: ${theme.borderSubtle};
	align-self: center;
`;

/**
 * メニューボタン共通スタイル。
 */
export const ObjectMenuButton = styled.button<{ isActive?: boolean }>`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	padding: 0;
	border-radius: ${theme.radius};
	border: 1px solid
		${(props) => (props.isActive ? theme.accent : "transparent")};
	background: ${(props) =>
		props.isActive ? theme.surfaceActive : "transparent"};
	cursor: pointer;
	user-select: none;
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:hover {
		background-color: ${theme.surfaceHover};
	}

	svg {
		color: ${theme.iconForeground};
		transition: color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
	}

	&:hover svg {
		color: ${theme.foreground};
	}

	&.active svg {
		color: ${theme.foreground};
	}

	&:disabled {
		cursor: default;
	}

	&:disabled:hover {
		background-color: transparent;
	}

	&:disabled svg,
	&:disabled:hover svg {
		color: ${theme.disabledForeground};
	}
`;

/**
 * メニューボタンの位置基準コンテナ（relative）。
 * ドロップダウンの基準位置になる。
 */
export const MenuItemPositioner = styled.div`
	position: relative;
`;
