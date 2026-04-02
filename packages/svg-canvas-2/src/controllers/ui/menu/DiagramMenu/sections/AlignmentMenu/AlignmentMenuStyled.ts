import styled from "@emotion/styled";

export const AlignmentDropdownPanel = styled.div`
	position: absolute;
	left: 50%;
	top: 36px;
	transform: translateX(-50%);
	z-index: 1100;
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 6px;
	background: white;
	border: 1px solid #ddd;
	border-radius: 6px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	pointer-events: auto;
`;

export const AlignmentRow = styled.div`
	display: flex;
	gap: 2px;
`;
