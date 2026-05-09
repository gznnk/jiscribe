import styled from "@emotion/styled";

import { MENU_BOX_SHADOW } from "../ObjectMenu/ObjectMenuConstants";

/**
 * シェイプライブラリのコンテナ。
 * ビューポート左側に固定し、pointer-events: auto で操作を受け付ける。
 */
export const ShapeLibraryContainer = styled.div`
	position: absolute;
	top: 50%;
	left: 8px;
	transform: translateY(-50%);
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 6px 4px;
	gap: 2px;
	background-color: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	box-shadow: ${MENU_BOX_SHADOW};
	pointer-events: auto;
	user-select: none;
`;

/**
 * シェイプライブラリの各アイテムボタン。
 */
export const ShapeLibraryButton = styled.button<{ isActive?: boolean }>`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	padding: 0;
	border-radius: 6px;
	border: 1px solid ${(props) => (props.isActive ? "#6b7280" : "transparent")};
	background: ${(props) => (props.isActive ? "#f9fafb" : "transparent")};
	cursor: ${(props) => (props.isActive ? "crosshair" : "grab")};
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:hover {
		background-color: #f3f4f6;
	}

	svg {
		color: #333333;
		transition: color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
	}
`;
