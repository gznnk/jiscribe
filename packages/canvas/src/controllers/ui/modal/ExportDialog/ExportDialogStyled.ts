import styled from "@emotion/styled";

import { theme } from "../../../../constants/theme";

/**
 * The whole form: the field grid plus the footer buttons. A <form> so Enter
 * in the margin input submits.
 */
export const Form = styled.form`
	display: flex;
	flex-direction: column;
`;

/**
 * One shared grid for all field rows (label column sized by the longest
 * label), so every label and every control start at the same x — including
 * the checkbox, which sits in the control column.
 */
export const FieldGrid = styled.div`
	display: grid;
	grid-template-columns: max-content 1fr;
	align-items: center;
	column-gap: 20px;
	row-gap: 16px;
	padding: 20px;
	font-size: 13px;
`;

export const FieldLabel = styled.span`
	grid-column: 1;
	color: ${theme.foregroundMuted};
`;

export const RadioGroup = styled.div`
	grid-column: 2;
	display: flex;
	align-items: center;
	gap: 16px;
`;

export const RadioOption = styled.label`
	display: flex;
	align-items: center;
	gap: 6px;
	cursor: pointer;

	input {
		margin: 0;
		accent-color: ${theme.accent};
		cursor: pointer;
	}
`;

/**
 * The checkbox row. Placed in the control column so its box aligns with the
 * radio buttons and the margin input above it.
 */
export const CheckboxOption = styled(RadioOption)`
	grid-column: 2;
`;

export const MarginInput = styled.input`
	grid-column: 2;
	justify-self: start;
	width: 80px;
	padding: 4px 8px;
	border: 1px solid ${theme.inputBorder};
	border-radius: 6px;
	background-color: ${theme.inputBg};
	color: ${theme.inputFg};
	font-size: 13px;

	&:focus {
		outline: 1px solid ${theme.accent};
		outline-offset: -1px;
	}

	/* Hide the native spinner (same convention as ObjectMenuSliderNumberInput);
	   its arrows cannot be themed and pick up odd backgrounds in VSCode */
	&::-webkit-outer-spin-button,
	&::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	&[type="number"] {
		-moz-appearance: textfield;
	}
`;

/** Footer separated by a border, mirroring the header (three-zone dialog). */
export const Footer = styled.div`
	display: flex;
	justify-content: flex-end;
	gap: 8px;
	padding: 12px 20px;
	border-top: 1px solid ${theme.border};
`;

const FooterButton = styled.button`
	padding: 6px 14px;
	border-radius: 6px;
	font-size: 13px;
	line-height: 1.4;
	cursor: pointer;
	transition: background-color 0.15s;

	&:disabled {
		cursor: default;
		opacity: 0.5;
	}
`;

export const CancelButton = styled(FooterButton)`
	border: 1px solid ${theme.border};
	background: transparent;
	color: ${theme.foreground};

	&:hover {
		background-color: ${theme.surfaceHover};
	}
`;

export const SubmitButton = styled(FooterButton)`
	border: 1px solid transparent;
	background-color: ${theme.accent};
	color: ${theme.surface};

	&:hover:not(:disabled) {
		filter: brightness(1.1);
	}
`;
