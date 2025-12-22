import styled from "@emotion/styled";

import { BOX_SHADOW } from "../../../../../../constants/styling/core/CommonStyling";

export const ColorPickerContainer = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	box-sizing: border-box;
	padding: 12px;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	background-color: #ffffff;
	box-shadow: ${BOX_SHADOW};
	user-select: none;
	pointer-events: auto;
	z-index: 1100;
`;

export const ColorGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(7, 28px);
	gap: 8px;
	margin-bottom: 12px;
`;

type ColorSwatchProps = {
	selected: boolean;
	color: string;
};

export const ColorSwatch = styled.div<ColorSwatchProps>`
	width: 28px;
	height: 28px;
	box-sizing: border-box;
	position: relative;
	border-radius: 50%;
	border: ${({ selected }) =>
		selected ? "2px solid #6b7280" : "1px solid #e5e7eb"};
	background: ${({ color }) =>
		color === "transparent"
			? "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 8px 8px"
			: color};
	cursor: pointer;
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:hover {
		border-color: #6b7280;
		transform: scale(1.15);
		box-shadow: ${BOX_SHADOW};
	}

	&:active {
		transform: scale(1.05);
	}
`;

type ColorInputProps = {
	isValid: boolean;
};

// TODO: Invalid時の制御がおかしい
export const ColorInput = styled.input<ColorInputProps>`
	width: 120px;
	height: 32px;
	padding: 4px 11px;
	box-sizing: border-box;
	border: 1px solid ${({ isValid }) => (isValid ? "#e5e7eb" : "#ef4444")};
	border-radius: 6px;
	background-color: #ffffff;
	color: #374151;
	font-size: 14px;
	text-align: center;
	outline: none;
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:focus {
		border-color: #6b7280;
		box-shadow: 0 0 0 2px rgba(107, 114, 128, 0.2);
	}

	&:hover {
		border-color: ${({ isValid }) => (isValid ? "#9ca3af" : "#f87171")};
	}

	::placeholder {
		color: #9ca3af;
		opacity: 1;
	}
`;
