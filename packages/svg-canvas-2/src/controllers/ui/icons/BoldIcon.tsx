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
	width = 20,
	height = 20,
	fill = "#333333",
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
			x="12"
			y="17"
			textAnchor="middle"
			fontSize="16"
			fontWeight="bold"
			fill={fill}
		>
			B
		</text>
	</svg>
);

export const BoldIcon = memo(BoldIconComponent);
