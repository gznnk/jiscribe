import { memo } from "react";

type GlyphProps = {
	size?: number;
};

/**
 * The small glyphs the comment panel's 20px buttons carry. They live here
 * rather than in `ui/icons` because nothing outside the panel draws them: the
 * menu button's own icon is `CommentIcon`.
 *
 * All three are on the 24 grid at stroke width 2, like the menu icons.
 */

/** Resolve / resolved: a check mark. */
const CheckGlyphComponent: React.FC<GlyphProps> = ({ size = 16 }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none">
		<path
			d="M5 13 L10 18 L19 6"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

export const CheckGlyph = memo(CheckGlyphComponent);

/** Edit: a pencil pointing at its bottom-left. */
const PencilGlyphComponent: React.FC<GlyphProps> = ({ size = 16 }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none">
		<path
			d="M4 20 L4 16 L16 4 L20 8 L8 20 Z"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

export const PencilGlyph = memo(PencilGlyphComponent);

/** Delete: a bin with its lid. */
const TrashGlyphComponent: React.FC<GlyphProps> = ({ size = 16 }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none">
		<path
			d="M4 7 H20"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
		/>
		<path
			d="M9 7 V5 H15 V7"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
		<path
			d="M6 7 L7 20 H17 L18 7"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

export const TrashGlyph = memo(TrashGlyphComponent);

/** Chevron of the resolved section; points right while closed, down while open. */
const ChevronGlyphComponent: React.FC<GlyphProps & { isOpen: boolean }> = ({
	size = 12,
	isOpen,
}) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		style={{ transform: isOpen ? "rotate(90deg)" : undefined }}
	>
		<path
			d="M9 5 L16 12 L9 19"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

export const ChevronGlyph = memo(ChevronGlyphComponent);
