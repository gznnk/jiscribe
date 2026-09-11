import { memo } from "react";

type ZoomToFitIconProps = {
	width?: number;
	height?: number;
};

/**
 * Zoom-to-fit icon: the four corners of a frame, the conventional fit-to-screen
 * glyph. Nothing sits inside the frame — at 24px there is no room to outline a
 * box between the arms without its hole shrinking to a dot, and a filled one
 * read as an unrelated mark rather than the drawing.
 *
 * Drawn at 24px like the sidebar icons rather than the 20px of undo / redo /
 * help: at 24px every coordinate is a whole number and the stroke-width 2 lines
 * (butt caps, mitre joins) cover whole pixels, where the 20px scale lands every
 * edge on a fraction and the straight arms blur.
 */
const ZoomToFitIconComponent: React.FC<ZoomToFitIconProps> = ({
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
			<path
				d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"
				stroke="currentColor"
				strokeWidth="2"
			/>
		</svg>
	);
};

export const ZoomToFitIcon = memo(ZoomToFitIconComponent);
