import { createElement, memo } from "react";

import { readIconNodes } from "../schema/icon/resolveIconName";
import { ICON_GRID_SIZE } from "../schema/IconDoc";

type IconGlyphProps = {
	/** Icon to draw; a name that resolves to nothing draws nothing. */
	name: string;
	/** Side of the square to draw it in, in px. */
	size: number;
};

/**
 * One icon drawn on its own, for the picker's grid and its toggle button.
 *
 * Separate from the canvas renderer: this one is a standalone `<svg>` sized in px and
 * painted with `currentColor`, where the shape draws into the canvas's own coordinate
 * space and carries the object's stroke settings.
 */
const IconGlyphComponent: React.FC<IconGlyphProps> = ({ name, size }) => {
	const nodes = readIconNodes(name);
	if (nodes === null) {
		return null;
	}
	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${ICON_GRID_SIZE} ${ICON_GRID_SIZE}`}
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{nodes.map(([tag, attrs], index) =>
				createElement(tag, { key: index, ...attrs }),
			)}
		</svg>
	);
};

export const IconGlyph = memo(IconGlyphComponent);
