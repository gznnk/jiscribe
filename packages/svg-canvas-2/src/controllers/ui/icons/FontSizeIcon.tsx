import { memo } from "react";

type FontSizeIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * フォントサイズアイコン。
 * 大きい "T" と小さい "T" を組み合わせて表示する。
 */
const FontSizeIconComponent: React.FC<FontSizeIconProps> = ({
	width = 20,
	height = 20,
	fill = "#333333",
	title = "Font Size",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{title}</title>
		<text
			x="8"
			y="18"
			textAnchor="middle"
			fontSize="18"
			fontWeight="bold"
			fill={fill}
		>
			T
		</text>
		<text
			x="19"
			y="18"
			textAnchor="middle"
			fontSize="12"
			fontWeight="bold"
			fill={fill}
		>
			T
		</text>
	</svg>
);

export const FontSizeIcon = memo(FontSizeIconComponent);
