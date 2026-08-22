import { memo } from "react";

type AutoHeightIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * Auto height icon.
 * Text lines (the last one short, as a paragraph ends) with a vertical
 * double-headed arrow beside them: the height is the lines' to decide.
 *
 * Drawn on a 22×22 grid at integer coordinates with 2px strokes so the
 * default 22px rendering lands on whole device pixels (a 16-viewBox drawn
 * at 22px blurs everything by the 1.375 non-integer scale).
 */
const AutoHeightIconComponent: React.FC<AutoHeightIconProps> = ({
	width = 22,
	height = 22,
	fill = "currentColor",
	title = "Auto Height",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 22 22"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
	>
		<title>{title}</title>
		{/* The text the height follows */}
		<path
			d="M3 5 H13 M3 11 H13 M3 17 H9"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
		/>
		{/* Vertical double-headed arrow */}
		<path d="M18 7 V15" stroke={fill} strokeWidth="2" />
		<path d="M18 2 L21 7 L15 7 Z" fill={fill} />
		<path d="M18 20 L15 15 L21 15 Z" fill={fill} />
	</svg>
);

export const AutoHeightIcon = memo(AutoHeightIconComponent);
