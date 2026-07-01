import { memo } from "react";

import { theme } from "../../../constants/theme";

type BorderColorIconProps = {
	color: string;
	size?: number;
	title?: string;
};

/**
 * Border color icon (a hollow circle).
 * Displays a hollow circle indicating the current stroke color.
 * For transparent, displays a checker-pattern stroke.
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
				/* Transparent indicator: a dashed ring. The dash is a faint overlay of the
				   foreground color and the gap shows through, producing two tones whose
				   contrast auto-inverts with the theme.
				   color-mix is not resolved in presentation attributes, so specify it via style. */
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
				/* color may be var(--vscode-*) (the resolved result of auto), so apply it via style. */
				<circle
					cx="12"
					cy="12"
					r="8"
					fill="none"
					strokeWidth="3"
					style={{ stroke: color }}
				/>
			)}
		</svg>
	);
};

export const BorderColorIcon = memo(BorderColorIconComponent);
