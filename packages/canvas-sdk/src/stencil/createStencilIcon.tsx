import type { StencilIconProps } from "@workspace/canvas";
import type { NamedExoticComponent, ReactNode } from "react";
import { memo } from "react";

/** Side of the square the drawing is authored in, and the icon's default size in px. */
const STENCIL_ICON_SIZE = 24;

/**
 * Wraps a palette glyph in the `<svg>` frame every stencil icon shares, so an
 * icon module declares only what it draws.
 *
 * The drawing is held in the closure rather than taken as a prop, so `width` and
 * `height` are all the returned component's `memo` has to compare.
 *
 * @param drawing SVG elements filling a 24×24 user-space box (`0 0 24 24`); one element, or several inside a fragment. Paint with `currentColor` to follow the palette button's color.
 * @returns A memoized component taking `width` / `height` in px, both defaulting to 24.
 */
export const createStencilIcon = (
	drawing: ReactNode,
): NamedExoticComponent<StencilIconProps> => {
	const StencilIcon: React.FC<StencilIconProps> = ({
		width = STENCIL_ICON_SIZE,
		height = STENCIL_ICON_SIZE,
	}) => {
		return (
			<svg
				width={width}
				height={height}
				viewBox={`0 0 ${STENCIL_ICON_SIZE} ${STENCIL_ICON_SIZE}`}
				xmlns="http://www.w3.org/2000/svg"
			>
				{drawing}
			</svg>
		);
	};

	return memo(StencilIcon);
};
