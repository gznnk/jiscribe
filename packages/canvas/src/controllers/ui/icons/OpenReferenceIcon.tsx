import { memo } from "react";

type OpenReferenceIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * Open reference icon.
 * The usual "external link" glyph: a frame opened at its top-right corner and
 * an arrow leaving through it.
 *
 * Drawn on the 24 grid at stroke width 2, like the rest of the menu icons, so
 * that the default 24px render maps one user unit to one device pixel. A 16
 * grid scaled up lands the strokes between pixels and looks blurred.
 */
const OpenReferenceIconComponent: React.FC<OpenReferenceIconProps> = ({
	width = 24,
	height = 24,
	fill = "currentColor",
	title = "Open reference",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
	>
		<title>{title}</title>
		{/* Frame, left open where the arrow exits */}
		<path
			d="M12 4 H6 a2 2 0 0 0 -2 2 V18 a2 2 0 0 0 2 2 H18 a2 2 0 0 0 2 -2 V12"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
		{/* Outgoing arrow: shaft, then the head sharing its tip at (20, 4) */}
		<path
			d="M11 13 L20 4"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
		/>
		<path
			d="M15 4 H20 V9"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

export const OpenReferenceIcon = memo(OpenReferenceIconComponent);
