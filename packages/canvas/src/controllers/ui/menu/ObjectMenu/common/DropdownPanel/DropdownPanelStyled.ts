import styled from "@emotion/styled";

import { theme } from "../../../../../../constants/theme";

/**
 * ドロップダウンパネルの styled 本体。ボタンの下または上に中央揃えで表示される。
 * offsetX はキャンバス領域からのはみ出しを防ぐための水平方向の補正量（px）。
 */
export const DropdownPanelRoot = styled.div<{
	placement?: "down" | "up";
	offsetX?: number;
}>`
	position: absolute;
	left: 50%;
	${(props) => (props.placement === "up" ? "bottom: 40px;" : "top: 40px;")}
	transform: translateX(calc(-50% + ${(props) => props.offsetX ?? 0}px));
	z-index: 1100;
	display: flex;
	align-items: center;
	flex-direction: column;
	justify-content: flex-start;
	pointer-events: auto;
	gap: 8px;
	background-color: ${theme.surface};
	border: 1px solid ${theme.border};
	border-radius: ${theme.radius};
	box-shadow: ${theme.shadow};
`;
