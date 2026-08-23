import { memo } from "react";

type TextVerticalBasisIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * Text vertical basis icon.
 * A shape that gives a band of its own height to its outline — a cylinder's cap
 * — with the two text lines sitting on the middle of the whole silhouette rather
 * than of the body below the cap: the basis is the shape's full height.
 *
 * Drawn on a 22×22 grid at integer coordinates with 2px strokes so the
 * default 22px rendering lands on whole device pixels (see AutoHeightIcon).
 */
const TextVerticalBasisIconComponent: React.FC<TextVerticalBasisIconProps> = ({
	width = 22,
	height = 22,
	fill = "currentColor",
	title = "Text Vertical Basis",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 22 22"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
	>
		<title>{title}</title>
		{/* The silhouette: straight sides and foot, spanning y 2 to 20 */}
		<path
			d="M3 6 V20 H19 V6"
			stroke={fill}
			strokeWidth="2"
			strokeLinejoin="round"
		/>
		{/* The cap the shape's own region gives up, leaving the body below y 6 */}
		<path d="M3 6 A8 4 0 0 1 19 6" stroke={fill} strokeWidth="2" />
		{/* The text, centred on y 11 — the middle of the whole silhouette */}
		<path
			d="M7 9 H15 M7 13 H15"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
		/>
	</svg>
);

export const TextVerticalBasisIcon = memo(TextVerticalBasisIconComponent);
