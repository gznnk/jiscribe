import { useCanvasTheme } from "@jiscribe/canvas/unstable";
import { createElement, memo, useId, useMemo } from "react";

import { readIconSetDrawingNodes } from "./readIconSetDrawingNodes";
import { suffixIconSetDrawingIds } from "./suffixIconSetDrawingIds";
import type {
	IconSetDrawing,
	IconSetNode,
} from "../../schema/iconSet/IconSetTypes";

/** Turns a node list into SVG elements; attribute names already carry React's spelling. */
const renderIconSetNodes = (nodes: readonly IconSetNode[]): React.ReactNode[] =>
	nodes.map(([tag, attrs, children], index) =>
		createElement(
			tag,
			{ key: index, ...attrs },
			children === undefined ? undefined : renderIconSetNodes(children),
		),
	);

type IconSetArtProps = {
	/** The icon to draw. */
	drawing: IconSetDrawing;
};

const IconSetArtComponent: React.FC<IconSetArtProps> = ({ drawing }) => {
	const { colorScheme } = useCanvasTheme();
	// useId's delimiters are not funcIRI-safe, so only its letters and digits are kept.
	const suffix = useId().replace(/[^a-zA-Z0-9_-]/g, "");
	const nodes = readIconSetDrawingNodes(drawing, colorScheme);
	const { idRefs } = drawing;
	const suffixedNodes = useMemo(
		() =>
			idRefs === undefined
				? nodes
				: suffixIconSetDrawingIds(nodes, idRefs, suffix),
		[nodes, idRefs, suffix],
	);
	return <>{renderIconSetNodes(suffixedNodes)}</>;
};

/**
 * Draws one icon, in the rendition the active theme's ground calls for.
 *
 * A component rather than a plain call because the theme is read through a hook:
 * the same drawing follows the theme wherever it is placed — on the canvas or on
 * a stencil glyph — and each place re-renders on its own when the host swaps
 * themes. The ids a drawing defines get a suffix of this instance's own, so the
 * same icon drawn twice never puts one id in the document twice.
 *
 * Memoized on `drawing`: pass the generated constant, not a copy, or every
 * render rebuilds the elements.
 *
 * @param drawing - the icon, in the asset's own viewBox units; the caller
 *   scales and places it (calcIconSetArtPlacement)
 * @returns the drawing's elements, with no wrapper of their own
 */
export const IconSetArt: React.FC<IconSetArtProps> = memo(IconSetArtComponent);
