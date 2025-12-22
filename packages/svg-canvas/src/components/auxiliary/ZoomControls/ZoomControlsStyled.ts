import styled from "@emotion/styled";

import { BOX_SHADOW } from "../../../constants/styling/core/CommonStyling";

export const ZoomControlsContainer = styled.div`
	display: flex;
	align-items: center;
	background: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	box-shadow: ${BOX_SHADOW};
	z-index: 1000;
	user-select: none;
	pointer-events: auto;
`;

export const ZoomButton = styled.button`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border: none;
	background: transparent;
	color: #374151;
	cursor: pointer;
	transition: all 0.2s ease;
	pointer-events: auto;

	&:hover {
		background: #f3f4f6;
		color: #1f2937;
	}

	&:active {
		background: #e5e7eb;
	}

	&:first-of-type {
		border-top-left-radius: 6px;
		border-bottom-left-radius: 6px;
	}

	&:last-of-type {
		border-top-right-radius: 6px;
		border-bottom-right-radius: 6px;
	}
`;

export const ZoomDisplay = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 48px;
	height: 32px;
	padding: 0 8px;
	font-size: 12px;
	font-weight: 500;
	color: #374151;
	border-left: 1px solid #e5e7eb;
	border-right: 1px solid #e5e7eb;
	cursor: pointer;
	transition: all 0.2s ease;
	pointer-events: auto;

	&:hover {
		background: #f3f4f6;
		color: #1f2937;
	}

	&:active {
		background: #e5e7eb;
	}
`;
