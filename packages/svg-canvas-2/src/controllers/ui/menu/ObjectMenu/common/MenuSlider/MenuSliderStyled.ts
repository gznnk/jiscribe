import styled from "@emotion/styled";

/**
 * Wrapper for the entire menu slider component.
 */
export const MenuSliderWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
	flex: 1;
`;

/**
 * Styled range input element for the menu slider.
 */
export const MenuSliderInput = styled.input`
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
		background: #333333;
		border-radius: 1px;
	}

	&::-moz-range-track {
		width: 100%;
		height: 2px;
		background: #333333;
		border-radius: 1px;
		border: none;
	}

	/* Thumb styles */
	&::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		background-color: #ffffff;
		border: 2px solid #333333;
		border-radius: 50%;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
		margin-top: -5px;
	}

	&::-moz-range-thumb {
		width: 12px;
		height: 12px;
		background-color: #ffffff;
		border: 2px solid #333333;
		border-radius: 50%;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
	}

	/* Hover and active states */
	&:hover::-webkit-slider-thumb {
		border-color: #1a1a1a;
		box-shadow: 0 0 0 3px rgba(51, 51, 51, 0.1);
	}

	&:hover::-moz-range-thumb {
		border-color: #1a1a1a;
		box-shadow: 0 0 0 3px rgba(51, 51, 51, 0.1);
	}

	&:active::-webkit-slider-thumb {
		transform: scale(1.05);
		box-shadow: 0 0 0 4px rgba(51, 51, 51, 0.15);
	}

	&:active::-moz-range-thumb {
		transform: scale(1.05);
		box-shadow: 0 0 0 4px rgba(51, 51, 51, 0.15);
	}
`;

/**
 * Footer section containing label and number input.
 */
export const MenuSliderFooter = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 8px;
`;

/**
 * Label for the menu slider.
 */
export const MenuSliderLabel = styled.label`
	font-size: 12px;
	font-weight: 600;
	color: #333333;
	user-select: none;
`;

/**
 * Number input for direct value entry.
 */
export const MenuSliderNumberInput = styled.input`
	display: block;
	width: 36px;
	height: 22px;
	padding: 2px 4px;
	text-align: center;
	outline: none;
	border: 1px solid #e5e7eb;
	border-radius: 4px;
	background-color: #ffffff;
	color: #374151;
	font-size: 12px;
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:focus {
		border-color: #6b7280;
		box-shadow: 0 0 0 2px rgba(107, 114, 128, 0.2);
	}

	&:hover {
		border-color: #9ca3af;
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
