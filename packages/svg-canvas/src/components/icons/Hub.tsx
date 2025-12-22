import { keyframes, css } from "@emotion/react";
import styled from "@emotion/styled";
import React, { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Animation for flash brightness effect
 */
const flashBrightness = keyframes`
    0%   { filter: brightness(1); }
    30%  { filter: brightness(2); }
    100% { filter: brightness(1); }
`;

/**
 * Styled component for flash effect group
 */
export const FlashGroup = styled.g<{ $flash: boolean }>`
	${({ $flash }) =>
		$flash &&
		css`
			animation: ${flashBrightness} 0.5s ease-out 1 forwards;
		`}
`;

/**
 * Hub icon component with optional flash animation
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.animation - Whether to show flash animation
 * @returns SVG element for hub icon
 */
const HubComponent: React.FC<IconProps> = ({
	width = 100,
	height = 100,
	animation = false,
	title,
}) => {
	return (
		<svg width={width} height={height} viewBox="0 0 100 100">
			<title>{title || "Hub"}</title>
			<FlashGroup $flash={animation}>
				<line
					x1="50"
					y1="40"
					x2="50"
					y2="10"
					stroke="#fed579"
					strokeWidth="3"
				/>
				<line
					x1="60"
					y1="50"
					x2="90"
					y2="50"
					stroke="#fed579"
					strokeWidth="3"
				/>
				<line
					x1="50"
					y1="60"
					x2="50"
					y2="90"
					stroke="#fed579"
					strokeWidth="3"
				/>
				<line
					x1="40"
					y1="50"
					x2="10"
					y2="50"
					stroke="#fed579"
					strokeWidth="3"
				/>
				<line
					x1="56.5"
					y1="43.5"
					x2="80"
					y2="20"
					stroke="#fed579"
					strokeWidth="3"
				/>
				<line
					x1="56.5"
					y1="56.5"
					x2="80"
					y2="80"
					stroke="#fed579"
					strokeWidth="3"
				/>
				<line
					x1="43.5"
					y1="43.5"
					x2="20"
					y2="20"
					stroke="#fed579"
					strokeWidth="3"
				/>
				<line
					x1="43.5"
					y1="56.5"
					x2="20"
					y2="80"
					stroke="#fed579"
					strokeWidth="3"
				/>
			</FlashGroup>
			<circle cx="50" cy="10" r="5" fill="#f2f2f2" />
			<circle cx="90" cy="50" r="5" fill="#f2f2f2" />
			<circle cx="50" cy="90" r="5" fill="#f2f2f2" />
			<circle cx="10" cy="50" r="5" fill="#f2f2f2" />
			<circle cx="80" cy="20" r="5" fill="#f2f2f2" />
			<circle cx="80" cy="80" r="5" fill="#f2f2f2" />
			<circle cx="20" cy="20" r="5" fill="#f2f2f2" />
			<circle cx="20" cy="80" r="5" fill="#f2f2f2" />
			<circle cx="50" cy="50" r="20" fill="#76d0de" />
			<FlashGroup $flash={animation}>
				<circle
					cx="50"
					cy="50"
					r="21"
					stroke="#fed579"
					strokeWidth="3"
					fill="none"
				/>
			</FlashGroup>
		</svg>
	);
};

export const Hub = memo(HubComponent);
