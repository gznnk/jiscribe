import { keyframes, css } from "@emotion/react";
import styled from "@emotion/styled";

const blinkAnimation = keyframes`
	0% {
		opacity: 1;
	}
	50% {
		opacity: 0.5;
	}
	100% {
		opacity: 1;
	}
`;

const disappearAnimation = keyframes`
	0% {
		opacity: 1;
	}
	80% {
		opacity: 1;
	}
	100% {
		opacity: 0;
	}
`;

export const StyledCircle = styled.circle<{
	statusColor: string;
	isProcessing: boolean;
	isDisappearing: boolean;
	translateX: number;
}>`
	fill: ${(props) => props.statusColor};
	transform: translateX(${(props) => props.translateX}px);
	transition:
		fill 0.5s linear,
		transform 0.3s ease-out;
	${({ isProcessing }) =>
		isProcessing &&
		css`
			animation: ${blinkAnimation} 1s ease-in-out infinite;
		`}
	${({ isDisappearing }) =>
		isDisappearing &&
		css`
			animation: ${disappearAnimation} 4s ease-out forwards;
		`}
`;
