import styled from "@emotion/styled";

import { theme } from "../../../../constants/theme";

/**
 * モーダルの背景オーバーレイ。クリックで閉じる。
 */
export const Backdrop = styled.div`
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: rgba(0, 0, 0, 0.25);
	pointer-events: auto;
	z-index: 2000;
`;

/**
 * モーダル本体のパネル。
 */
export const Panel = styled.div`
	display: flex;
	flex-direction: column;
	width: min(400px, calc(100% - 32px));
	/* 検索結果の件数で大きさが変わらないよう高さを固定する */
	height: min(560px, calc(100% - 64px));
	background-color: ${theme.surface};
	border: 1px solid ${theme.border};
	border-radius: 12px;
	box-shadow: ${theme.shadow};
	overflow: hidden;
	font-size: 14px;
	color: ${theme.foreground};
`;

export const Header = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	border-bottom: 1px solid ${theme.border};
`;

export const Title = styled.h2`
	margin: 0;
	font-size: 16px;
	font-weight: 600;
`;

export const CloseButton = styled.button`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	padding: 0;
	border: none;
	border-radius: 6px;
	background: transparent;
	color: ${theme.foregroundMuted};
	font-size: 20px;
	line-height: 1;
	cursor: pointer;
	transition: background-color 0.15s;

	&:hover {
		background-color: ${theme.surfaceHover};
	}
`;

export const Body = styled.div`
	flex: 1;
	min-height: 0;
	padding: 8px 20px 20px;
	overflow-y: auto;
	/* コマンド名（左列）とショートカット（右列）を全行で揃える */
	display: grid;
	grid-template-columns: 1fr auto;
	align-items: center;
	column-gap: 24px;
	row-gap: 2px;
`;

export const CategoryTitle = styled.h3`
	/* 2 列にまたがる見出し */
	grid-column: 1 / -1;
	justify-self: start;
	margin: 16px 0 8px;
	font-size: 12px;
	font-weight: 600;
	text-align: left;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: ${theme.foregroundMuted};
`;

export const RowLabel = styled.span`
	grid-column: 1;
	justify-self: start;
	padding: 4px 0;
	text-align: left;
`;

export const KeyGroup = styled.span`
	grid-column: 2;
	/* 右列内で左揃え → 全行の先頭キーが同じ x で揃う */
	justify-self: start;
	display: flex;
	align-items: center;
	gap: 4px;
`;

export const KeyCap = styled.kbd`
	min-width: 22px;
	padding: 2px 6px;
	border: 1px solid ${theme.borderSubtle};
	border-bottom-width: 2px;
	border-radius: 4px;
	background-color: ${theme.surfaceHover};
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	font-size: 12px;
	line-height: 1.4;
	text-align: center;
	color: ${theme.foreground};
`;
