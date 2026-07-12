import { memo } from "react";

import { theme } from "../../../constants/theme";

type ColorPreviewIconProps = {
	color: string;
	size?: number;
	title?: string;
};

/**
 * Color preview icon (a filled circle).
 * Displays a filled circle indicating the current color.
 * When transparent, displays a checker pattern instead.
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
						{/* Overlay the foreground color faintly on only the two diagonal cells,
						    leaving the rest transparent (the surface shows through) → the checker
						    contrast auto-inverts with the theme.
						    color-mix is not resolved in presentation attributes, so specify it via style. */}
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
				// fill may hold var(--jiscribe-*) (the auto-fill surface color).
				// var() is not resolved in presentation attributes, so apply it via style.
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
