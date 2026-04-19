import { memo } from "react";

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
				<>
					{/* Background checkered pattern using stroke-dasharray */}
					<circle
						cx="12"
						cy="12"
						r="8"
						fill="none"
						stroke="#ccc"
						strokeWidth="4"
						strokeDasharray="3 2"
					/>
					<circle
						cx="12"
						cy="12"
						r="8"
						fill="none"
						stroke="#fff"
						strokeWidth="4"
						strokeDasharray="3 2"
						strokeDashoffset="3"
					/>
				</>
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
