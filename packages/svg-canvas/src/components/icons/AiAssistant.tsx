import { css, keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Animation for ribbon gently floating
 */
const float = keyframes`
	0%, 100% { transform: translateY(0); }
	50% { transform: translateY(-1px); }
`;

/**
 * Animation for sparkles twinkling
 */
const sparkle = keyframes`
	0%, 100% { opacity: 0.3; }
	50% { opacity: 1; }
`;

/**
 * Styled component for animated ribbon
 */
const AnimatedRibbon = styled.g<{ $animation: boolean }>`
	${({ $animation }) =>
		$animation &&
		css`
			animation: ${float} 2s ease-in-out infinite;
			transform-origin: center;
		`}
`;

/**
 * Styled component for animated sparkles
 */
const AnimatedSparkle = styled.circle<{ $animation: boolean }>`
	${({ $animation }) =>
		$animation &&
		css`
			animation: ${sparkle} 1.5s ease-in-out infinite;
		`}
`;

/**
 * AiAssistant icon component - cute girl face icon
 */
const AiAssistantComponent: React.FC<IconProps> = ({
	width = 60,
	height = 60,
	animation = false,
	title,
}) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 60 60"
			width={width}
			height={height}
		>
			<title>{title || "AI Assistant"}</title>

			{/* Face circle */}
			<circle
				cx="30"
				cy="30"
				r="18"
				fill="#FFE5D9"
				stroke="#FFD1BA"
				strokeWidth="1.5"
			/>

			{/* Hair - rounded top with wavy bangs */}
			<path
				d="M 10 26 Q 10 9, 30 7 Q 50 9, 50 26 L 48 26 Q 46 23, 44 25 Q 42 23, 40 25 Q 38 23, 36 25 Q 34 23, 30 23 Q 26 23, 24 25 Q 22 23, 20 25 Q 18 23, 16 25 Q 14 23, 12 26 Z"
				fill="#6B4423"
			/>

			{/* Side hair pigtails */}
			<circle cx="12" cy="28" r="5" fill="#6B4423" />
			<circle cx="48" cy="28" r="5" fill="#6B4423" />

			{/* Ribbon on the left */}
			<AnimatedRibbon $animation={animation}>
				<ellipse cx="12" cy="23" rx="3.5" ry="2.5" fill="#FF6B9D" />
				<ellipse cx="8.5" cy="23" rx="2.5" ry="2" fill="#FF6B9D" />
				<circle cx="12" cy="23" r="1.5" fill="#FF1493" />
			</AnimatedRibbon>

			{/* Ribbon on the right */}
			<AnimatedRibbon $animation={animation}>
				<ellipse cx="48" cy="23" rx="3.5" ry="2.5" fill="#FF6B9D" />
				<ellipse cx="51.5" cy="23" rx="2.5" ry="2" fill="#FF6B9D" />
				<circle cx="48" cy="23" r="1.5" fill="#FF1493" />
			</AnimatedRibbon>

			{/* Eyes - simple closed/happy eyes */}
			<path
				d="M 22 28 Q 24 30, 26 28"
				stroke="#6B4423"
				strokeWidth="2"
				fill="none"
				strokeLinecap="round"
			/>
			<path
				d="M 34 28 Q 36 30, 38 28"
				stroke="#6B4423"
				strokeWidth="2"
				fill="none"
				strokeLinecap="round"
			/>

			{/* Cute smile */}
			<path
				d="M 22 36 Q 30 39, 38 36"
				stroke="#FF6B9D"
				strokeWidth="1.5"
				fill="none"
				strokeLinecap="round"
			/>

			{/* Cheek blush */}
			<circle cx="18" cy="33" r="2.5" fill="#FF6B9D" opacity="0.4" />
			<circle cx="42" cy="33" r="2.5" fill="#FF6B9D" opacity="0.4" />

			{/* Sparkles around the head */}
			<AnimatedSparkle
				cx="10"
				cy="18"
				r="1.5"
				fill="#FFD700"
				$animation={animation}
			/>
			<AnimatedSparkle
				cx="50"
				cy="18"
				r="1.5"
				fill="#FFD700"
				$animation={animation}
			/>
			<AnimatedSparkle
				cx="6"
				cy="30"
				r="1"
				fill="#FFD700"
				$animation={animation}
			/>
			<AnimatedSparkle
				cx="54"
				cy="30"
				r="1"
				fill="#FFD700"
				$animation={animation}
			/>
		</svg>
	);
};

export const AiAssistant = memo(AiAssistantComponent);
