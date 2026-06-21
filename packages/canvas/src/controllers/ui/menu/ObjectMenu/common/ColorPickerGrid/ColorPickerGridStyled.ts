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
	justify-content: center;
	align-self: stretch;
	margin-top: 8px;
	padding-top: 8px;
	border-top: 1px solid ${theme.borderSubtle};
`;

type ColorTextInputProps = {
	isValid: boolean;
};

export const ColorTextInput = styled.input<ColorTextInputProps>`
	width: 160px;
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

type AutoOptionProps = {
	selected: boolean;
};

/**
 * 「自動（テーマ追従）」を選ぶ行。グリッド上部に配置し、押下で色を auto sentinel に戻す。
 */
export const AutoOption = styled.div<AutoOptionProps>`
	display: flex;
	align-items: center;
	gap: 8px;
	align-self: stretch;
	box-sizing: border-box;
	margin-bottom: 8px;
	padding: 4px 8px;
	border: ${({ selected }) =>
		selected ? `2px solid ${theme.accent}` : `1px solid ${theme.borderSubtle}`};
	border-radius: ${theme.radius};
	color: ${theme.foreground};
	font-size: 12px;
	cursor: pointer;
	transition: all 0.15s ease;

	&:hover {
		border-color: ${theme.accent};
	}
`;

/**
 * 自動オプションのプレビュー円。
 * background は auto の解決色（ロール別）を呼び出し側が style で当てる。
 */
export const AutoOptionDot = styled.span`
	width: 16px;
	height: 16px;
	flex: none;
	border-radius: 50%;
	border: 1px solid ${theme.borderSubtle};
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
