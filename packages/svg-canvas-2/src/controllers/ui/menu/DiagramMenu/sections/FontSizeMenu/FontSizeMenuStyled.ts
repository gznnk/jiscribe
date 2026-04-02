import styled from "@emotion/styled";

export const SliderContainer = styled.div`
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 8px;
	min-width: 160px;
`;

export const SliderLabel = styled.div`
	font-size: 11px;
	font-weight: 600;
	color: #374151;
	user-select: none;
`;

export const SliderRow = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
`;

export const SliderInput = styled.input`
	flex: 1;
	height: 2px;
	-webkit-appearance: none;
	appearance: none;
	background: #d1d5db;
	border-radius: 1px;
	outline: none;
	cursor: pointer;

	&::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		background: white;
		border: 2px solid #333;
		border-radius: 50%;
		cursor: pointer;
	}
`;

export const NumberDisplay = styled.div`
	min-width: 28px;
	height: 22px;
	padding: 2px 4px;
	text-align: center;
	border: 1px solid #e5e7eb;
	border-radius: 4px;
	font-size: 11px;
	color: #374151;
	line-height: 18px;
`;
