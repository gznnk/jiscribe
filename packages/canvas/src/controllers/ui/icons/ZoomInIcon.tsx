import { memo } from "react";

type ZoomInIconProps = {
	width?: number;
	height?: number;
};

/**
 * Zoom-in icon: a plus sign.
 *
 * An SVG rather than the text glyph it replaces: a font's "+" is hinted and
 * antialiased by the text renderer and sat a step blurrier and lighter than the
 * stroke-width 2 icons beside it. Whole-number coordinates at 24px put the
 * lines on whole pixels.
 */
const ZoomInIconComponent: React.FC<ZoomInIconProps> = ({
	width = 24,
	height = 24,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
		>
			<path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" />
		</svg>
	);
};

export const ZoomInIcon = memo(ZoomInIconComponent);
