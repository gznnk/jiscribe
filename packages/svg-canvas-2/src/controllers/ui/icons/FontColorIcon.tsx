import { memo } from "react";

type FontColorIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	underlineColor?: string;
	title?: string;
};

/**
 * フォントカラーアイコン。
 * "A" の文字と下部にカラーバーを表示する。
 */
const FontColorIconComponent: React.FC<FontColorIconProps> = ({
	width = 20,
	height = 20,
	fill = "#333333",
	underlineColor = "#333333",
	title = "Font Color",
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
			y="16"
			textAnchor="middle"
			fontSize="16"
			fontWeight="bold"
			fill={fill}
		>
			A
		</text>
		<rect x="4" y="20" width="16" height="2.5" rx="1" fill={underlineColor} />
	</svg>
);

export const FontColorIcon = memo(FontColorIconComponent);
