import styled from "@emotion/styled";

import { theme } from "../../../../constants/theme";

/**
 * The modal's background overlay. Click to close.
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
 * The modal body panel. Width is capped to the canvas; height follows the
 * content unless `panelHeight` fixes it.
 */
export const Panel = styled.div<{
	panelWidth: number;
	panelHeight?: number;
}>`
	display: flex;
	flex-direction: column;
	width: ${({ panelWidth }) => `min(${panelWidth}px, calc(100% - 32px))`};
	${({ panelHeight }) =>
		panelHeight === undefined
			? ""
			: `height: min(${panelHeight}px, calc(100% - 64px));`}
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
