import { keyframes, css } from "@emotion/react";
import styled from "@emotion/styled";
import React, { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Animation for sun rise and set
 */
const riseAndSet = keyframes`
  0%   { transform: rotate(0deg); }
  50%  { transform: rotate(180deg); }
  100% { transform: rotate(360deg); }
`;

/**
 * Styled component for sun animation group
 */
const SunGroup = styled.g<{ $animate: boolean }>`
	transform-origin: 32px 48px; /* Center at ridge line */
	transform-box: view-box;
	${({ $animate }) =>
		$animate &&
		css`
			animation: ${riseAndSet} 3s linear infinite;
		`}
`;

/**
 * Animation for sky color change
 */
const skyColor = keyframes`
    0%   { fill: #ffffff; }
    25%  { fill: #ffffff; }
    50%  { fill: #0d47a1; }
    75%  { fill: #0d47a1; }
    100% { fill: #ffffff; }
`;

/**
 * Styled component for sky animation
 */
const Sky = styled.rect<{ $animate: boolean }>`
	${({ $animate }) =>
		$animate &&
		css`
			animation: ${skyColor} 3s linear infinite;
		`}
`;

/**
 * Picture icon component
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.animation - Whether to show animation
 * @returns SVG element for picture icon
 */
const PictureComponent: React.FC<IconProps> = ({
	width = 60,
	height = 60,
	animation = false,
	title,
}) => {
	return (
		<svg width={width} height={height} viewBox="0 0 60 60">
			<title>{title || "Picture"}</title>
			<Sky $animate={animation} width="60" height="60" fill="#ffffff" />
			<polygon points="8,48 20,30 30,42 42,22 52,48" fill="#2196F3" />
			<SunGroup $animate={animation}>
				<circle cx="32" cy="18" r="4" fill="#FFC107" />
			</SunGroup>
		</svg>
	);
};

export const Picture = memo(PictureComponent);
