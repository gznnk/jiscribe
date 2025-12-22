import { css, keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Animation for the blinking effect.
 */
const blink = keyframes`
	0%, 100% { fill: #00D1B2; }
	50%      { fill: #f1fa16; }
`;

/**
 * Styled component for the small rectangle that blinks.
 */
const SmallRect = styled.rect<{ $blink: boolean }>`
	fill: #00d1b2;
	${({ $blink }) =>
		$blink &&
		css`
			animation: ${blink} 0.75s steps(1) infinite;
		`}
`;

/**
 * CPU_1 component that renders a CPU icon with optional blinking effect.
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.animation - Whether to show blinking animation
 * @returns SVG element for CPU icon
 */
const CPU_1Component: React.FC<IconProps> = ({
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
			<title>{title || "CPU"}</title>
			<rect x="0" y="0" width="80" height="80" rx="10" ry="10" fill="#0A0A37" />
			<g fill="none" stroke="#00D1B2" strokeWidth="2">
				<rect x="20" y="20" width="40" height="40" rx="5" ry="5" />
				<path d="M25 25 Q30 35, 40 30 T55 45" strokeLinecap="round" />
				<path d="M25 55 Q35 45, 40 50 T55 35" strokeLinecap="round" />
			</g>
			<SmallRect x="2" y="37" width="6" height="6" $blink={animation} />
			<SmallRect x="72" y="37" width="6" height="6" $blink={animation} />
			<SmallRect x="37" y="2" width="6" height="6" $blink={animation} />
			<SmallRect x="37" y="72" width="6" height="6" $blink={animation} />
		</svg>
	);
};

export const CPU_1 = memo(CPU_1Component);
