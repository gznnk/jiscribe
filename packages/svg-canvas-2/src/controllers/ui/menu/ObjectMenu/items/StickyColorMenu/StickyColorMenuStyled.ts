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

export const ColorGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(5, 28px);
	gap: 6px;
`;

type ColorSwatchProps = {
	selected: boolean;
	swatchColor: string;
};

export const ColorSwatch = styled.div<ColorSwatchProps>`
	width: 28px;
	height: 28px;
	box-sizing: border-box;
	border-radius: 4px;
	border: ${({ selected }) =>
		selected ? `2px solid ${theme.accent}` : `1px solid ${theme.borderSubtle}`};
	background: ${({ swatchColor }) =>
		swatchColor === "transparent"
			? "repeating-conic-gradient(#888 0% 25%, #444 0% 50%) 50% / 8px 8px"
			: swatchColor};
	cursor: pointer;
	transition: all 0.15s ease;

	&:hover {
		border-color: ${theme.accent};
		transform: scale(1.1);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
	}

	&:active {
		transform: scale(1.02);
	}
`;
