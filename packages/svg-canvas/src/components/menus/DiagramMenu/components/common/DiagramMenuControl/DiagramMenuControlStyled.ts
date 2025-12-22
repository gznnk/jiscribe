import styled from "@emotion/styled";

export const DiagramMenuControlPositioner = styled.div`
	position: absolute;
	left: 50%;
	top: 40px;
	transform: translateX(-50%);
	z-index: 1100;
`;

export const DiagramMenuControlContainer = styled.div`
	height: 100%;
	display: flex;
	align-items: center;
	flex-direction: column;
	justify-content: flex-start;
	pointer-events: none;
	gap: 8px;
`;
