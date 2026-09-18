import { memo } from "react";

type CommentIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * Comment icon.
 * A speech bubble with a tail dropping left of centre and two lines of text inside.
 *
 * Drawn on the 24 grid at stroke width 2, like the rest of the menu icons, so
 * that the default 24px render maps one user unit to one device pixel. A 16
 * grid scaled up lands the strokes between pixels and looks blurred.
 */
const CommentIconComponent: React.FC<CommentIconProps> = ({
	width = 24,
	height = 24,
	fill = "currentColor",
	title = "Comments",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
	>
		<title>{title}</title>
		{/* Bubble with all four corners rounded, closed through the tail on its bottom edge */}
		<path
			d="M3 6 a2 2 0 0 1 2 -2 H19 a2 2 0 0 1 2 2 V15 a2 2 0 0 1 -2 2 H12 L8 21 V17 H5 a2 2 0 0 1 -2 -2 Z"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
		{/* Two lines of text, the second one short */}
		<path d="M8 9 H16" stroke={fill} strokeWidth="2" strokeLinecap="round" />
		<path d="M8 13 H13" stroke={fill} strokeWidth="2" strokeLinecap="round" />
	</svg>
);

export const CommentIcon = memo(CommentIconComponent);
