import styled from "@emotion/styled";

import { MENU_BOX_SHADOW } from "../ObjectMenu/ObjectMenuConstants";

/**
 * ショートカット一覧を開く「?」ボタン。
 * ビューポート右下に固定する。
 */
export const HelpButton = styled.button`
	position: absolute;
	bottom: 8px;
	right: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	padding: 0;
	border-radius: 50%;
	border: 1px solid #e5e7eb;
	background-color: #ffffff;
	box-shadow: ${MENU_BOX_SHADOW};
	cursor: pointer;
	pointer-events: auto;
	transition: background-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:hover {
		background-color: #f3f4f6;
	}

	&:active {
		background-color: #e5e7eb;
	}
`;

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
	background-color: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	box-shadow: ${MENU_BOX_SHADOW};
	overflow: hidden;
	font-size: 14px;
	color: #333333;
`;

export const Header = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	border-bottom: 1px solid #e5e7eb;
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
	color: #6b7280;
	font-size: 20px;
	line-height: 1;
	cursor: pointer;
	transition: background-color 0.15s;

	&:hover {
		background-color: #f3f4f6;
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
	color: #9ca3af;
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
	border: 1px solid #d1d5db;
	border-bottom-width: 2px;
	border-radius: 4px;
	background-color: #f9fafb;
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	font-size: 12px;
	line-height: 1.4;
	text-align: center;
	color: #374151;
`;
