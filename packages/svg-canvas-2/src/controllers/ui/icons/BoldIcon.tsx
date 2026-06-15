import { memo } from "react";

type BoldIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * 太字アイコン。
 * "B" の文字を太字で表示する。
 */
const BoldIconComponent: React.FC<BoldIconProps> = ({
	width = 24,
	height = 24,
	fill = "currentColor",
	title = "Bold",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{title}</title>
		<text
			x="50%"
			y="50%"
			dominantBaseline="central"
			textAnchor="middle"
			fontFamily="Arial, Helvetica, sans-serif"
			fontSize="22"
			fontWeight="600"
			fill={fill}
		>
			B
		</text>
	</svg>
);

export const BoldIcon = memo(BoldIconComponent);
