import styled from "@emotion/styled";

import { theme } from "../../../../../../constants/theme";

/**
 * Wrapper for the entire menu slider component.
 */
export const ObjectMenuSliderWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
	flex: 1;
`;

/**
 * Styled range input element for the menu slider.
 */
export const ObjectMenuSliderInput = styled.input`
	flex: 1;
	height: 2px;
	-webkit-appearance: none;
	appearance: none;
	background: transparent;
	outline: none;
	cursor: pointer;
	margin-bottom: 8px;

	/* Track styles */
	&::-webkit-slider-runnable-track {
		width: 100%;
		height: 2px;
		background: ${theme.sliderTrack};
		border-radius: 1px;
	}

	&::-moz-range-track {
		width: 100%;
		height: 2px;
		background: ${theme.sliderTrack};
		border-radius: 1px;
		border: none;
	}

	/* Thumb styles */
	&::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		background-color: ${theme.foreground};
		border: 2px solid ${theme.accent};
		border-radius: 50%;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
		margin-top: -5px;
	}

	&::-moz-range-thumb {
		width: 12px;
		height: 12px;
		background-color: ${theme.foreground};
		border: 2px solid ${theme.accent};
		border-radius: 50%;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
	}

	/* Hover and active states */
	&:hover::-webkit-slider-thumb {
		border-color: ${theme.accent};
		box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.12);
	}

	&:hover::-moz-range-thumb {
		border-color: ${theme.accent};
		box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.12);
	}

	&:active::-webkit-slider-thumb {
		transform: scale(1.05);
		box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.18);
	}

	&:active::-moz-range-thumb {
		transform: scale(1.05);
		box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.18);
	}
`;

/**
 * Footer section containing label and number input.
 */
export const ObjectMenuSliderFooter = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 8px;
`;

/**
 * Label for the menu slider.
 */
export const ObjectMenuSliderLabel = styled.label`
	font-size: 12px;
	font-weight: 600;
	color: ${theme.foreground};
	user-select: none;
`;

/**
 * Number input for direct value entry.
 */
export const ObjectMenuSliderNumberInput = styled.input`
	display: block;
	width: 36px;
	height: 22px;
	padding: 2px 4px;
	text-align: center;
	outline: none;
	border: 1px solid ${theme.inputBorder};
	border-radius: 4px;
	background-color: ${theme.inputBg};
	color: ${theme.inputFg};
	font-size: 12px;
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:focus {
		border-color: ${theme.accent};
		box-shadow: 0 0 0 2px rgba(107, 114, 128, 0.2);
	}

	&:hover {
		border-color: ${theme.foregroundMuted};
	}

	/* Hide spinner buttons */
	&::-webkit-outer-spin-button,
	&::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	&[type="number"] {
		-moz-appearance: textfield;
	}
`;
