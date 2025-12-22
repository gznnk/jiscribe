import { css, keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Animation for up and down movement
 */
const moveUpDown = keyframes`
    0% { transform: translateY(0); }
    25% { transform: translateY(-3px); }
	50% { transform: translateY(7px); }
    100% { transform: translateY(0); }
`;

/**
 * Styled component for animated group
 */
const AnimatedGroup = styled.g<{ $animation: boolean }>`
	${({ $animation }) =>
		$animation &&
		css`
			animation: ${moveUpDown} 1s ease-out infinite;
		`}
`;

/**
 * Agent icon component
 */
const AgentComponent: React.FC<IconProps> = ({
	width = 80,
	height = 80,
	animation = false,
	title,
}) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 80 80"
			width={width}
			height={height}
		>
			<title>{title || "Agent"}</title>
			<rect x="0" y="0" width="80" height="80" fill="#000" rx="8" ry="8" />
			<circle cx="40" cy="40" r="30" fill="#fff" />
			<AnimatedGroup $animation={animation}>
				<rect x="15" y="30" width="20" height="10" fill="#000" />
				<rect x="45" y="30" width="20" height="10" fill="#000" />
				<line x1="35" y1="35" x2="45" y2="35" stroke="#000" strokeWidth="3" />
			</AnimatedGroup>
		</svg>
	);
};

export const Agent = memo(AgentComponent);
