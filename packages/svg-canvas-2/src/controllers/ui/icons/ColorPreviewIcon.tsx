import { memo } from "react";

type ColorPreviewIconProps = {
	color: string;
	size?: number;
	title?: string;
};

/**
 * カラープレビューアイコン。
 * 現在の色を示す塗りつぶし円を表示する。
 * transparent の場合はチェッカーパターンを表示する。
 */
const ColorPreviewIconComponent: React.FC<ColorPreviewIconProps> = ({
	color,
	size = 20,
	title = "Color",
}) => {
	const isTransparent =
		color === "transparent" || color === "rgba(0,0,0,0)" || color === "";

	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 20 20"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			{isTransparent && (
				<defs>
					<pattern
						id="transparent-pattern"
						x="0"
						y="0"
						width="6"
						height="6"
						patternUnits="userSpaceOnUse"
					>
						<rect x="0" y="0" width="3" height="3" fill="#ccc" />
						<rect x="3" y="0" width="3" height="3" fill="#fff" />
						<rect x="0" y="3" width="3" height="3" fill="#fff" />
						<rect x="3" y="3" width="3" height="3" fill="#ccc" />
					</pattern>
				</defs>
			)}
			<circle
				cx="10"
				cy="10"
				r="8"
				stroke="#ddd"
				strokeWidth="1"
				fill={isTransparent ? "url(#transparent-pattern)" : color}
			/>
		</svg>
	);
};

export const ColorPreviewIcon = memo(ColorPreviewIconComponent);
