import styled from "@emotion/styled";

import {
	MIN_POPOVER_HEIGHT,
	MIN_POPOVER_WIDTH,
} from "../../../constants/styling/auxiliary/DiagramInfoPopoverStyling";
import { BOX_SHADOW } from "../../../constants/styling/core/CommonStyling";

type PopoverContainerProps = {
	zIndex?: number;
};

export const PopoverContainer = styled.div<PopoverContainerProps>`
	position: absolute;
	z-index: ${(props) => props.zIndex ?? 1050};
	pointer-events: auto;
	background: rgba(255, 255, 255, 1);
	backdrop-filter: blur(8px);
	border: 1px solid #e5e7eb;
	border-radius: 0.5rem;
	box-shadow: ${BOX_SHADOW};
	min-width: ${MIN_POPOVER_WIDTH}px;
	min-height: ${MIN_POPOVER_HEIGHT}px;
	width: max-content;
	max-width: 300px;
	font-family: Noto Sans JP;
	overflow: hidden;
`;

export const PopoverContent = styled.div`
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 12px;
`;

export const PopoverFieldContainer = styled.div`
	display: flex;
	flex-direction: column;
	gap: 6px;
`;

export const PopoverLabel = styled.label`
	font-size: 12px;
	font-weight: 500;
	color: #374151;
	line-height: 1.25;
	user-select: none;
`;

export const PopoverText = styled.div`
	font-size: 12px;
	color: #737373;
	line-height: 1.25;
	background: rgba(255, 255, 255, 0.8);
	font-family: inherit;
	min-height: 1.5em;
	word-wrap: break-word;
`;
