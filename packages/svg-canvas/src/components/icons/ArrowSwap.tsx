import type React from "react";
import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

const ArrowSwapComponent: React.FC<IconProps> = ({
	width,
	height,
	fill,
	title,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 512 512"
			version="1.1"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			<g
				id="Page-1"
				stroke="none"
				strokeWidth="1"
				fill="none"
				fillRule="evenodd"
			>
				<g id="drop" fill={fill} transform="translate(42.666667, 42.666667)">
					<path
						d="M298.666667,170.666667 L426.666667,298.666667 L298.666667,426.666667 L268.373333,396.373333 L344.96,320 L170.666667,320 L170.666667,277.333333 L344.96,277.333333 L268.373333,200.96 L298.666667,170.666667 Z M128,7.10542736e-15 L158.293333,30.2933333 L81.7066667,106.666667 L256,106.666667 L256,149.333333 L81.7066667,149.333333 L158.293333,225.706667 L128,256 L-2.13162821e-14,128 L128,7.10542736e-15 Z"
						id="Combined-Shape"
					></path>
				</g>
			</g>
		</svg>
	);
};

export const ArrowSwap = memo(ArrowSwapComponent);
