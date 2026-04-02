import styled from "@emotion/styled";

export const ArrowGrid = styled.div`
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 4px;
`;

export const ArrowSection = styled.div`
	display: flex;
	flex-direction: column;
	gap: 2px;
`;

export const ArrowSectionLabel = styled.div`
	font-size: 10px;
	font-weight: 600;
	color: #6b7280;
	padding: 0 4px;
	user-select: none;
`;

export const ArrowTypeRow = styled.div`
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 2px;
`;

export const ArrowTypeButton = styled.button<{ isActive?: boolean }>`
	display: flex;
	align-items: center;
	justify-content: center;
	height: 24px;
	padding: 2px 6px;
	border: 1px solid ${(p) => (p.isActive ? "#6b7280" : "#e5e7eb")};
	border-radius: 4px;
	background: ${(p) => (p.isActive ? "#f3f4f6" : "transparent")};
	cursor: pointer;
	font-size: 9px;
	color: #374151;
	white-space: nowrap;
	transition: all 0.15s;

	&:hover {
		background: #f0f0f0;
		border-color: #9ca3af;
	}
`;
