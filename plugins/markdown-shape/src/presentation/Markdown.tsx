import { createFrameObject } from "@workspace/canvas-sdk";

import { MarkdownOverlay } from "./MarkdownOverlay";
import { MarkdownCard } from "./MarkdownStyled";
import type { MarkdownState } from "../state/MarkdownState";

/**
 * Markdown card presentation. The body is the only thing that differs from a
 * Rect, so the card is drawn as a plain rect here and the text overlay is
 * swapped for the Markdown renderer — every shared Frame derivation (transform,
 * auto-color resolution, dashes, text region, memo) stays in createFrameObject.
 */
export const Markdown = createFrameObject<MarkdownState>(
	(state, shape) => (
		<MarkdownCard
			{...shape}
			x={-state.width / 2}
			y={-state.height / 2}
			width={state.width}
			height={state.height}
			rx={state.rx}
		/>
	),
	(textOverlayProps) => <MarkdownOverlay {...textOverlayProps} />,
);
