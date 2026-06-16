import { memo } from "react";

type ColorPreviewIconProps = {
	color: string;
	size?: number;
	title?: string;
};

/**
 * カラープレビューアイコン（塗りつぶし円）。
 * 現在の色を示す塗りつぶし円を表示する。
 * transparent の場合はチェッカーパターンを表示する。
 */
const ColorPreviewIconComponent: React.FC<ColorPreviewIconProps> = ({
	color,
	size = 24,
	title = "Color",
}) => {
	const isTransparent =
		color === "transparent" || color === "rgba(0,0,0,0)" || color === "";

	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			{isTransparent && (
				<defs>
					<pattern
						id="color-preview-transparent-pattern"
						x="0"
						y="0"
						width="8"
						height="8"
						patternUnits="userSpaceOnUse"
					>
						<rect x="0" y="0" width="4" height="4" fill="#444" />
						<rect x="4" y="0" width="4" height="4" fill="#888" />
						<rect x="0" y="4" width="4" height="4" fill="#888" />
						<rect x="4" y="4" width="4" height="4" fill="#444" />
					</pattern>
				</defs>
			)}
			<circle
				cx="12"
				cy="12"
				r="10"
				stroke="rgba(128, 128, 128, 0.5)"
				strokeWidth="1"
				fill={isTransparent ? "url(#color-preview-transparent-pattern)" : color}
			/>
		</svg>
	);
};

export const ColorPreviewIcon = memo(ColorPreviewIconComponent);
