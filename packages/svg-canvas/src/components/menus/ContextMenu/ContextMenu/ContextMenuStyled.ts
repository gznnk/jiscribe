import styled from "@emotion/styled";

import { BOX_SHADOW } from "../../../../constants/styling/core/CommonStyling";

/**
 * Properties for the ContextMenuContainer.
 */
type ContextMenuDivProps = {
	x: number;
	y: number;
	zIndex: number;
};

/**
 * Style for the context menu.
 */
export const ContextMenuDiv = styled.div<ContextMenuDivProps>`
	position: absolute;
	top: ${(props) => props.y}px;
	left: ${(props) => props.x}px;
	min-width: 200px;
	padding: 4px 0;
	background-color: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	box-shadow: ${BOX_SHADOW};
	pointer-events: auto;
	user-select: none;
	z-index: ${(props) => props.zIndex};
`;

/**
 * Styled div element for context menu divider.
 * This is used to separate different sections of the context menu.
 */
export const ContextMenuDivider = styled.div`
	height: 1px;
	margin: 4px 12px;
	background-color: #f3f4f6;
`;
