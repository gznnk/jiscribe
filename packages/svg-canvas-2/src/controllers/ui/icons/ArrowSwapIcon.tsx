import { memo } from "react";

type ArrowSwapIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * 矢印の Start / End を入れ替えるアイコン。
 * 元の svg-canvas から移植した SVG パスを使用。
 */
const ArrowSwapIconComponent: React.FC<ArrowSwapIconProps> = ({
	width = 24,
	height = 24,
	fill = "#333333",
	title = "Swap arrows",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 512 512"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{title}</title>
		<path
			fill={fill}
			d="M298.666667,170.666667 L426.666667,298.666667 L298.666667,426.666667 L268.373333,396.373333 L344.96,320 L170.666667,320 L170.666667,277.333333 L344.96,277.333333 L268.373333,200.96 L298.666667,170.666667 Z M128,0 L158.293333,30.293333 L81.706667,106.666667 L256,106.666667 L256,149.333333 L81.706667,149.333333 L158.293333,225.706667 L128,256 L0,128 L128,0 Z"
		/>
	</svg>
);

export const ArrowSwapIcon = memo(ArrowSwapIconComponent);
