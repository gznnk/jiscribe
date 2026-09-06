import { memo } from "react";

type EllipsisIconProps = {
	width?: number;
	height?: number;
};

/**
 * Horizontal ellipsis (…) icon, used for the toggle opening the shape library.
 *
 * The dots are filled circles rather than the usual hairline glyph: the button
 * sits next to stroke-width 2 stencil icons and a lighter mark reads as disabled
 * beside them. Radius 2 on integer centers puts every edge on a pixel boundary
 * at 24px, so the dots stay sharp instead of smearing over half pixels.
 */
const EllipsisIconComponent: React.FC<EllipsisIconProps> = ({
	width = 24,
	height = 24,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<circle cx="5" cy="12" r="2" fill="currentColor" />
			<circle cx="12" cy="12" r="2" fill="currentColor" />
			<circle cx="19" cy="12" r="2" fill="currentColor" />
		</svg>
	);
};

export const EllipsisIcon = memo(EllipsisIconComponent);
