import styled from "@emotion/styled";

import { theme } from "../../../../../../constants/theme";

export const ColorPickerContainer = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	box-sizing: border-box;
	padding: 12px;
	user-select: none;
`;

export const ColorInputRow = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	align-self: stretch;
	margin-top: 8px;
	padding-top: 8px;
	border-top: 1px solid ${theme.borderSubtle};
`;

type AutoButtonProps = {
	selected: boolean;
};

/**
 * 入力欄の左に置く「Auto（テーマ追従）」ボタン。
 * 押下で色を auto sentinel に戻す。選択中はアクセント色で示す。
 */
export const AutoButton = styled.button<AutoButtonProps>`
	flex: none;
	height: 28px;
	padding: 0 10px;
	box-sizing: border-box;
	border: 1px solid
		${({ selected }) => (selected ? theme.accent : theme.inputBorder)};
	border-radius: ${theme.radius};
	background: ${theme.inputBg};
	color: ${({ selected }) => (selected ? theme.accent : theme.inputFg)};
	font-size: 12px;
	cursor: pointer;
	user-select: none;
	transition: all 0.15s ease;

	&:hover {
		border-color: ${theme.accent};
	}
`;

type ColorTextInputProps = {
	isValid: boolean;
};

export const ColorTextInput = styled.input<ColorTextInputProps>`
	flex: 1;
	min-width: 0;
	height: 28px;
	padding: 0 8px;
	box-sizing: border-box;
	border: 1px solid
		${({ isValid }) => (isValid ? theme.inputBorder : theme.errorFg)};
	border-radius: ${theme.radius};
	background: ${theme.inputBg};
	color: ${theme.inputFg};
	font-size: 12px;
	text-align: center;
	outline: none;

	&:focus {
		border-color: ${theme.accent};
		box-shadow: 0 0 0 1px ${theme.accent};
	}

	&:hover {
		border-color: ${({ isValid }) =>
			isValid ? theme.foregroundMuted : theme.errorFg};
	}

	::placeholder {
		color: ${theme.inputPlaceholder};
	}
`;

export const ColorGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(7, 24px);
	gap: 6px;
`;

type ColorSwatchProps = {
	selected: boolean;
	swatchColor: string;
};

export const ColorSwatch = styled.div<ColorSwatchProps>`
	width: 24px;
	height: 24px;
	box-sizing: border-box;
	border-radius: 50%;
	border: ${({ selected }) =>
		selected ? `2px solid ${theme.accent}` : `1px solid ${theme.borderSubtle}`};
	background: ${({ swatchColor }) =>
		swatchColor === "transparent"
			? `repeating-conic-gradient(${theme.transparentChecker} 0% 25%, transparent 0% 50%) 50% / 8px 8px`
			: swatchColor};
	cursor: pointer;
	transition: all 0.15s ease;

	&:hover {
		border-color: ${theme.accent};
		transform: scale(1.15);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
	}

	&:active {
		transform: scale(1.05);
	}
`;
