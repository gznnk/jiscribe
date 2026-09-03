import { memo } from "react";

type TextWrapIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * Text-wrap icon.
 * Three lines of text between two solid walls, the last one short: the width is
 * the box's to state and the breaks are the width's to decide.
 *
 * Drawn on a 22×22 grid at integer coordinates with 2px strokes so the
 * default 22px rendering lands on whole device pixels (see AutoHeightIcon).
 */
const TextWrapIconComponent: React.FC<TextWrapIconProps> = ({
	width = 22,
	height = 22,
	fill = "currentColor",
	title = "Wrap Text",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 22 22"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
	>
		<title>{title}</title>
		{/* The two edges the text wraps between */}
		<path
			d="M3 3 V19 M19 3 V19"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
		/>
		{/* The lines the width breaks the text into */}
		<path
			d="M6 7 H16 M6 11 H16 M6 15 H12"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
		/>
	</svg>
);

export const TextWrapIcon = memo(TextWrapIconComponent);
