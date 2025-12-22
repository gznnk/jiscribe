import { keyframes, css } from "@emotion/react";
import styled from "@emotion/styled";

/* Temporarily increase brightness to make it appear "flashing" */
const flashBrightness = keyframes`
    0%   { filter: brightness(1); }
    30%  { filter: brightness(2); }
    100% { filter: brightness(1); }
`;

export const FlashGroup = styled.g<{ $flash: boolean }>`
	${({ $flash }) =>
		$flash &&
		css`
			animation: ${flashBrightness} 0.5s ease-out 1 forwards;
		`}
`;
