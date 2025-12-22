// Import Emotion for styling
import { keyframes, css } from "@emotion/react";
import styled from "@emotion/styled";
import React, { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Animation for rotation effect
 */
const orbit = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

/**
 * Counter rotation animation
 */
const counterOrbit = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(-360deg);
  }
`;

/**
 * Styled component for orbit group
 */
const OrbitGroup = styled.g<{ $animation: boolean }>`
	${({ $animation }) =>
		$animation &&
		css`
			animation: ${orbit} 2s linear infinite;
			transform-origin: 50px 30px;
		`}
`;

/**
 * Styled component for counter-rotating elements within orbit
 */
const CounterRotate = styled.g<{ $animation: boolean }>`
	${({ $animation }) =>
		$animation &&
		css`
			animation: ${counterOrbit} 2s linear infinite;
			transform-origin: 60px 20px;
		`}
`;

/**
 * Web Search icon component
 */
const WebSearchComponent: React.FC<IconProps> = ({
	width = 100,
	height = 100,
	animation = false,
	title,
}) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={width}
			height={height}
			viewBox="0 0 80 80"
		>
			<title>{title || "WebSearch"}</title>
			<rect x="0" y="0" width="80" height="80" rx="10" ry="10" fill="#f5f5f5" />
			<circle cx="40" cy="40" r="25" fill="#6fa3ef" />
			<path
				d="M40,15 C46,18 52,18 58,15 C56,23 50,25 45,27 C40,30 37,32 32,35 C29,36 25,34 22,32 C18,30 15,24 15,20"
				fill="none"
				stroke="#fff"
				strokeWidth="1.5"
			/>
			<path
				d="M40,65 C46,68 52,67 57,63 C55,57 52,50 45,45 C40,40 37,36 32,33 C26,30 22,35 18,39 C15,42 15,48 17,55"
				fill="none"
				stroke="#fff"
				strokeWidth="1.5"
			/>
			<OrbitGroup $animation={animation}>
				<CounterRotate $animation={animation}>
					<g transform="translate(60, 20)">
						<circle
							cx="0"
							cy="0"
							r="8"
							fill="none"
							stroke="#ff69b4"
							strokeWidth="2"
						/>
						<line
							x1="5"
							y1="5"
							x2="15"
							y2="15"
							stroke="#ff69b4"
							strokeWidth="2"
						/>
					</g>
				</CounterRotate>
			</OrbitGroup>
		</svg>
	);
};

export const WebSearch = memo(WebSearchComponent);
