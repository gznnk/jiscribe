import styled from "@emotion/styled";

export const ColorPickerContainer = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	box-sizing: border-box;
	padding: 12px;
	user-select: none;
`;

export const NativeColorPickerRow = styled.div`
	display: flex;
	align-items: center;
	align-self: stretch;
	margin-top: 8px;
	padding-top: 8px;
	border-top: 1px solid #e5e7eb;
`;

type NativeColorPickerButtonProps = {
	isCustom: boolean;
};

export const NativeColorPickerButton = styled.button<NativeColorPickerButtonProps>`
	display: flex;
	align-items: center;
	gap: 6px;
	flex: 1;
	height: 28px;
	padding: 0 8px;
	border: ${({ isCustom }) => (isCustom ? "2px solid #6b7280" : "1px solid #e5e7eb")};
	border-radius: 6px;
	background: white;
	cursor: pointer;
	font-size: 12px;
	color: #374151;
	user-select: none;

	&:hover {
		border-color: #6b7280;
		background: #f9fafb;
	}

	&:active {
		background: #f3f4f6;
	}
`;

type NativeColorPreviewProps = {
	previewColor: string;
};

export const NativeColorPreview = styled.div<NativeColorPreviewProps>`
	width: 16px;
	height: 16px;
	border-radius: 3px;
	border: 1px solid #d1d5db;
	background: ${({ previewColor }) => previewColor};
	flex-shrink: 0;
`;

export const NativeColorInput = styled.input`
	position: absolute;
	width: 1px;
	height: 1px;
	opacity: 0;
	overflow: hidden;
	pointer-events: none;
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
		selected ? "2px solid #6b7280" : "1px solid #e5e7eb"};
	background: ${({ swatchColor }) =>
		swatchColor === "transparent"
			? "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 8px 8px"
			: swatchColor};
	cursor: pointer;
	transition: all 0.15s ease;

	&:hover {
		border-color: #6b7280;
		transform: scale(1.15);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
	}

	&:active {
		transform: scale(1.05);
	}
`;
