import styled from "@emotion/styled";

import { BOX_SHADOW } from "../../../constants/styling/core/CommonStyling";

/**
 * Properties for the DiagramMenuWrapper.
 */
type DiagramMenuWrapperProps = {
	x: number;
	y: number;
	zIndex?: number;
};

/**
 * Styled element for the diagram menu wrapper.
 */
export const DiagramMenuWrapper = styled.div<DiagramMenuWrapperProps>`
	position: absolute;
	top: ${(props) => props.y}px;
	left: ${(props) => props.x}px;
	display: flex;
	justify-content: flex-start;
	z-index: ${(props) => props.zIndex ?? 1060};
`;

/**
 * Styled element for the diagram menu.
 */
export const DiagramMenuDiv = styled.div`
	height: 40px;
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	align-items: center;
	font-size: 14px;
	padding: 4px 8px;
	background-color: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	box-shadow: ${BOX_SHADOW};
	pointer-events: auto;
	user-select: none;
`;

/**
 * Styled element for the diagram menu divider.
 */
export const DiagramMenuDivider = styled.div`
	width: 1px;
	height: 16px;
	margin: 0 8px;
	background-color: #f3f4f6;
	align-self: center;
`;

/**
 * Styled element for the diagram menu controll positioning.
 */
export const DiagramMenuPositioner = styled.div`
	position: relative;
`;
