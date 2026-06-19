import { memo } from "react";

type ArrowHeadIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * 矢印メニュー用のアイコン。
 * 直線と矢印先端を表示する。
 */
const ArrowHeadIconComponent: React.FC<ArrowHeadIconProps> = ({
	width = 24,
	height = 24,
	fill = "currentColor",
	title = "Arrow Head",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
	>
		<title>{title}</title>
		<line
			x1="4"
			y1="12"
			x2="18"
			y2="12"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
		/>
		<polygon points="20,12 14,8 14,16" fill={fill} />
	</svg>
);

export const ArrowHeadIcon = memo(ArrowHeadIconComponent);
