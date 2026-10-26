import { memo } from "react";

type PinIconProps = {
	width?: number;
	height?: number;
};

/**
 * Push pin, the toggle pinning a library category to the stencil rail.
 *
 * Drawn for 16px on its own 16-unit grid with stroke-width 1: every line runs
 * on half-unit coordinates (x.5), so it covers whole pixels, and the 45° flare
 * steps one pixel per row. The straight lines are separate square-capped
 * strokes rather than one joined outline, because Chromium leaves the outer
 * quarter of a 1px mitered corner unpainted. Drawn at another size the lines
 * blur; the catalog rows draw it at 16px.
 */
const PinIconComponent: React.FC<PinIconProps> = ({
	width = 16,
	height = 16,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M5.5 1.5h4M5.5 1.5v5M9.5 1.5v5M2.5 10.5h10M2.5 9.5v1M12.5 9.5v1"
				stroke="currentColor"
				strokeWidth="1"
				strokeLinecap="square"
			/>
			<path
				d="M5.5 6.5l-3 3M9.5 6.5l3 3M7.5 10.5V15"
				stroke="currentColor"
				strokeWidth="1"
			/>
		</svg>
	);
};

export const PinIcon = memo(PinIconComponent);
