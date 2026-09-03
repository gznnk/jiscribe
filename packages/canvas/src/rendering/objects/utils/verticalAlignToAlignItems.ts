import type { VerticalAlign } from "@jiscribe/doc/model/objects/types/VerticalAlign";
import type React from "react";

/**
 * Maps a domain vertical-align value to the flex `align-items` value.
 *
 * This mapping is the single visual contract shared by the rendered text
 * overlay and the edit-mode textarea. Keeping it in one place ensures that
 * entering or leaving edit mode never shifts the text vertically.
 */
export const verticalAlignToAlignItems: Record<
	VerticalAlign,
	React.CSSProperties["alignItems"]
> = {
	top: "flex-start",
	middle: "center",
	bottom: "flex-end",
} as const;
