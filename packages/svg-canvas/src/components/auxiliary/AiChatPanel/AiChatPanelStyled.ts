import styled from "@emotion/styled";

import { BOX_SHADOW } from "../../../constants/styling/core/CommonStyling";

export const AiChatContainer = styled.div<{ isOpen: boolean }>`
	display: flex;
	flex-direction: column;
	background: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	box-shadow: ${BOX_SHADOW};
	z-index: 999;
	user-select: none;
	pointer-events: auto;
	width: ${(props) => (props.isOpen ? "400px" : "auto")};
	height: ${(props) => (props.isOpen ? "500px" : "auto")};
`;

export const AiChatToggleButton = styled.button<{ isOpen: boolean }>`
	display: flex;
	align-items: center;
	justify-content: center;
	width: ${(props) => (props.isOpen ? "100%" : "48px")};
	height: 48px;
	border: none;
	background: transparent;
	color: #374151;
	cursor: pointer;
	transition: all 0.2s ease;
	pointer-events: auto;
	border-radius: ${(props) => (props.isOpen ? "8px 8px 0 0" : "8px")};
	border-bottom: ${(props) => (props.isOpen ? "1px solid #e5e7eb" : "none")};
	font-size: 14px;
	font-weight: 500;
	gap: 8px;

	&:hover {
		background: #f3f4f6;
		color: #1f2937;
	}

	&:active {
		background: #e5e7eb;
	}

	svg {
		width: 20px;
		height: 20px;
	}
`;

export const AiChatContent = styled.div<{ isOpen: boolean }>`
	display: ${(props) => (props.isOpen ? "flex" : "none")};
	flex-direction: column;
	flex: 1;
	overflow: hidden;
	border-radius: 0 0 8px 8px;
`;
