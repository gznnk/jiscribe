import { memo } from "react";

import { theme } from "../../../constants/theme";

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
						{/* 対角の 2 マスだけ前景色を薄く重ね、残りは透明（面が透ける）→
						    テーマに応じて市松の濃淡が自動反転する。
						    color-mix は presentation 属性では解決されないため style で指定する。 */}
						<rect
							x="0"
							y="0"
							width="4"
							height="4"
							style={{ fill: theme.transparentChecker }}
						/>
						<rect
							x="4"
							y="4"
							width="4"
							height="4"
							style={{ fill: theme.transparentChecker }}
						/>
					</pattern>
				</defs>
			)}
			<circle
				cx="12"
				cy="12"
				r="10"
				stroke="rgba(128, 128, 128, 0.5)"
				strokeWidth="1"
				// fill は var(--vscode-*)（auto fill のサーフェス色）を取りうる。
				// var() は presentation 属性では解決されないため style で当てる。
				style={{
					fill: isTransparent
						? "url(#color-preview-transparent-pattern)"
						: color,
				}}
			/>
		</svg>
	);
};

export const ColorPreviewIcon = memo(ColorPreviewIconComponent);
