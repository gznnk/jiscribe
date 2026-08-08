import { createStencilIcon } from "@workspace/canvas-sdk";

/**
 * The note at the stencil size. Drawn landscape, unlike the portrait file
 * pictogram it shares an outline with, so the palette shows what the shape is
 * for: a box to write a sentence in. Hand-written rather than built from
 * buildNoteFigure, so the icon keeps its own optical margins as the path
 * construction changes.
 */
export const NoteIcon = createStencilIcon(
	<>
		<path
			d="M2 5 H17 L22 10 V19 H2 Z"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinejoin="round"
			strokeLinecap="round"
		/>
		<path
			d="M17 5 V10 H22"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinejoin="round"
			strokeLinecap="round"
		/>
	</>,
);
