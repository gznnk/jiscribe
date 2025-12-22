import type { TextAlign } from "../../../../types/core/TextAlign";
import type { VerticalAlign } from "../../../../types/core/VerticalAlign";

/**
 * Map of horizontal text alignment to CSS `text-align` values.
 */
export const TextAlignMap: Record<TextAlign, React.CSSProperties["textAlign"]> =
	{
		left: "left",
		center: "center",
		right: "right",
	};

/**
 * Map of vertical text alignment to CSS `align-items` values.
 */
export const VerticalAlignMap: Record<
	VerticalAlign,
	React.CSSProperties["alignItems"]
> = {
	start: "start",
	center: "center",
	end: "end",
};
