import { useCanvasTheme } from "@jiscribe/canvas-sdk";
import { createElement } from "react";

import { readAwsIconDrawing } from "./readAwsIconDrawing";
import type { AwsIconEntry, AwsIconNode } from "../schema/icon/AwsIconNode";

/**
 * Turns a generated node list into SVG elements. Attribute names already carry
 * React's spelling, so they go straight to `createElement`.
 *
 * @param nodes - the elements to draw, nested the same way for a `<g>`'s content
 * @returns the elements; an empty array in gives an empty array out
 */
export const renderAwsIconNodes = (
	nodes: readonly AwsIconNode[],
): React.ReactNode[] =>
	nodes.map(([tag, attrs, children], index) =>
		createElement(
			tag,
			{ key: index, ...attrs },
			children === undefined ? undefined : renderAwsIconNodes(children),
		),
	);

type AwsIconArtProps = {
	/** The icon to draw, as {@link import("../schema/icon/resolveAwsIconName").readAwsIcon} answers it. */
	entry: AwsIconEntry;
};

/**
 * Draws one icon, in the rendition the active theme's ground calls for.
 *
 * A component rather than a plain call because the theme is read through a hook:
 * this way the same drawing follows the theme wherever it is placed — on the
 * canvas, in the icon picker, on a palette glyph — and each place re-renders on
 * its own when the host swaps themes.
 */
export const AwsIconArt: React.FC<AwsIconArtProps> = ({ entry }) => {
	const { colorScheme } = useCanvasTheme();
	return <>{renderAwsIconNodes(readAwsIconDrawing(entry, colorScheme))}</>;
};
