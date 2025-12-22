import styled from "@emotion/styled";

import { BOX_SHADOW } from "../../../../../../constants/styling/core/CommonStyling";

/**
 * Styled container element for the number stepper.
 */
export const NumberStepperContainer = styled.div`
	height: 40px;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	flex-direction: row;
	background-color: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	box-shadow: ${BOX_SHADOW};
	padding: 4px;
	pointer-events: auto;
	user-select: none;
	z-index: 1100;
`;

/**
 * Styled input element for the number stepper.
 */
export const NumberStepperInput = styled.input`
	display: block;
	width: 48px;
	height: 28px;
	margin: 0 4px;
	padding: 4px 8px;
	text-align: center;
	outline: none;
	border: 1px solid #e5e7eb;
	border-radius: 4px;
	background-color: #ffffff;
	color: #374151;
	font-size: 14px;
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:focus {
		border-color: #6b7280;
		box-shadow: 0 0 0 2px rgba(107, 114, 128, 0.2);
	}

	&:hover {
		border-color: #9ca3af;
	}
`;

/**
 * Styled button element for increment/decrement in the number stepper.
 */
export const NumberStepperButton = styled.div`
	display: flex;
	width: 28px;
	height: 28px;
	box-sizing: border-box;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	border-radius: 4px;
	cursor: pointer;
	user-select: none;
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:hover {
		background-color: #f3f4f6;
	}

	&:active {
		background-color: #e5e7eb;
		transform: scale(0.95);
	}

	svg {
		color: #6b7280;
		transition: color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
	}

	&:hover svg {
		color: #374151;
	}
`;
