import { css, keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import React, { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Animation for page design creation
 */
const createAnimation = keyframes`
    0% { transform: scale(1) rotate(0deg); }
    25% { transform: scale(1.05) rotate(2deg); }
    50% { transform: scale(1.1) rotate(-2deg); }
    75% { transform: scale(1.05) rotate(1deg); }
    100% { transform: scale(1) rotate(0deg); }
`;

/**
 * Styled component for animated group
 */
const AnimatedGroup = styled.g<{ $animation: boolean }>`
	${({ $animation }) =>
		$animation &&
		css`
			animation: ${createAnimation} 1.5s ease-in-out infinite;
			transform-origin: center;
		`}
`;

/**
 * PageDesign icon component
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.animation - Whether to show animation
 * @returns SVG element for page design icon
 */
const PageDesignComponent: React.FC<IconProps> = ({
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
			<title>{title || "Page Design"}</title>
			<AnimatedGroup $animation={animation}>
				{/* Page background */}
				<rect
					x="10"
					y="8"
					width="60"
					height="64"
					rx="4"
					fill="#1A1F33"
					stroke="#3A79B8"
					strokeWidth="2"
				/>

				{/* Header section */}
				<rect
					x="15"
					y="13"
					width="50"
					height="8"
					rx="2"
					fill="#3A79B8"
					opacity="0.7"
				/>

				{/* Navigation elements */}
				<rect x="18" y="16" width="6" height="2" rx="1" fill="#C0C4D2" />
				<rect x="26" y="16" width="6" height="2" rx="1" fill="#C0C4D2" />
				<rect x="34" y="16" width="6" height="2" rx="1" fill="#C0C4D2" />

				{/* Content sections */}
				<rect
					x="15"
					y="25"
					width="22"
					height="20"
					rx="2"
					fill="#2A2F4C"
					stroke="#4EA1FF"
					strokeWidth="1"
					opacity="0.8"
				/>
				<rect
					x="40"
					y="25"
					width="25"
					height="12"
					rx="2"
					fill="#2A2F4C"
					stroke="#4EA1FF"
					strokeWidth="1"
					opacity="0.8"
				/>

				{/* Text lines */}
				<rect x="18" y="28" width="16" height="1" fill="#B0B0B0" />
				<rect x="18" y="31" width="12" height="1" fill="#B0B0B0" />
				<rect x="18" y="34" width="14" height="1" fill="#B0B0B0" />

				{/* Sidebar content */}
				<rect x="43" y="28" width="19" height="1" fill="#B0B0B0" />
				<rect x="43" y="31" width="15" height="1" fill="#B0B0B0" />

				{/* Footer section */}
				<rect
					x="15"
					y="50"
					width="50"
					height="15"
					rx="2"
					fill="#2A2F4C"
					stroke="#3A79B8"
					strokeWidth="1"
					opacity="0.6"
				/>

				{/* Footer elements */}
				<rect x="18" y="53" width="20" height="1" fill="#666B82" />
				<rect x="18" y="56" width="16" height="1" fill="#666B82" />
				<rect x="18" y="59" width="12" height="1" fill="#666B82" />

				{/* Design tools indicator */}
				<circle cx="70" cy="15" r="3" fill="#4EA1FF" />
				<circle cx="70" cy="15" r="1.5" fill="#C0C4D2" />
			</AnimatedGroup>
		</svg>
	);
};

export const PageDesign = memo(PageDesignComponent);
