import { memo } from "react";

import { theme } from "../../../constants/theme";

type BorderColorIconProps = {
	color: string;
	size?: number;
	title?: string;
};

/**
 * ボーダーカラーアイコン（中空の円）。
 * 現在のストローク色を示す中空の円を表示する。
 * transparent の場合はチェッカーパターンのストロークを表示する。
 */
const BorderColorIconComponent: React.FC<BorderColorIconProps> = ({
	color,
	size = 24,
	title = "Border Color",
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
			{isTransparent ? (
				/* 透明インジケータ: 破線リング。dash が前景色の薄い重ね、gap は面が透ける
				   2 トーンになり、テーマに応じて濃淡が自動反転する。
				   color-mix は presentation 属性では解決されないため style で指定する。 */
				<circle
					cx="12"
					cy="12"
					r="8"
					fill="none"
					strokeWidth="4"
					strokeDasharray="3 2"
					style={{ stroke: theme.transparentChecker }}
				/>
			) : (
				<circle
					cx="12"
					cy="12"
					r="8"
					fill="none"
					stroke={color}
					strokeWidth="3"
				/>
			)}
		</svg>
	);
};

export const BorderColorIcon = memo(BorderColorIconComponent);
