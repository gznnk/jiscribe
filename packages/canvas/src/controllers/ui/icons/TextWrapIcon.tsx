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
		viewBox="0 0 16 16"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
	>
		<title>{title}</title>
		{/* The two edges the text wraps between */}
		<path
			d="M1.6 2.2 V13.8 M14.4 2.2 V13.8"
			stroke={fill}
			strokeWidth="1.3"
			strokeLinecap="round"
		/>
		{/* The lines the width breaks the text into */}
		<path
			d="M4.2 5.2 H11.8 M4.2 8 H11.8 M4.2 10.8 H8.6"
			stroke={fill}
			strokeWidth="1.3"
			strokeLinecap="round"
		/>
	</svg>
);

export const TextWrapIcon = memo(TextWrapIconComponent);
