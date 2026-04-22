import { memo } from "react";

type AspectRatioIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * アスペクト比アイコン。
 * 矩形と対角の両端矢印で「比率維持」を示す。
 */
const AspectRatioIconComponent: React.FC<AspectRatioIconProps> = ({
	width = 24,
	height = 24,
	fill = "#333333",
	title = "Keep Aspect Ratio",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 16 16"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
	>
		<title>{title}</title>
		{/* Outer rectangle */}
		<rect
			x="1.5"
			y="1.5"
			width="13"
			height="13"
			stroke={fill}
			strokeWidth="1.3"
			fill="none"
		/>
		{/* Diagonal arrow line */}
		<path
			d="M5.5 5.5 L10.5 10.5"
			stroke={fill}
			strokeWidth="1.3"
			strokeLinecap="round"
		/>
		{/* Top-left arrow head */}
		<path d="M3 3 L7.5 3 L3 7.5 Z" fill={fill} />
		{/* Bottom-right arrow head */}
		<path d="M13 13 L8.5 13 L13 8.5 Z" fill={fill} />
	</svg>
);

export const AspectRatioIcon = memo(AspectRatioIconComponent);
