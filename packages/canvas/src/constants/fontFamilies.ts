/**
 * The `sans` stack, named once so the default and the list below cannot drift.
 *
 * A stack rather than one family, and a designed pair rather than two faces that
 * happen to sit well together: Noto Sans JP is Source Han Sans, whose
 * proportional Latin is drawn from Source Sans, so the two agree on weight and
 * vertical metrics by construction — which is what a line of mixed Japanese and
 * English needs. The generic keyword at the end is what draws the text when the
 * host has not imported `@jiscribe/canvas/fonts.css`, so a family never resolves
 * to nothing.
 */
const SANS_STACK = '"Source Sans 3", "Noto Sans JP", sans-serif';

/**
 * Fallback font for a doc/label with no explicit fontFamily, and the built-in
 * default for new shapes that the Canvas `theme` prop (`CanvasTheme.fontFamily`)
 * overrides. The `sans` entry of {@link CANVAS_FONT_FAMILIES}.
 */
export const DEFAULT_FONT_FAMILY = SANS_STACK;

/** Identifies one entry of {@link CANVAS_FONT_FAMILIES}; also its message key suffix. */
export type CanvasFontFamilyId = "sans" | "serif" | "mono" | "hand";

/** One font the object menu offers. */
export type CanvasFontFamily = {
	/** Which of the four roles this is; the menu translates it into a label. */
	id: CanvasFontFamilyId;
	/**
	 * Written to a text slot's `fontFamily` as-is, so it must stay stable: a doc
	 * saved today keeps this exact string. A Latin face first, a JP face behind
	 * it, and a generic keyword last.
	 */
	stack: string;
};

/**
 * The fonts a document may be written in, in menu order, `sans` first because it
 * is also {@link DEFAULT_FONT_FAMILY}.
 *
 * Deliberately a closed set. A box whose size is derived from its content is
 * measured in JS against the family the doc names (`measureText`), so a family
 * the viewer does not have is not a cosmetic substitution — it re-measures the
 * box. Offering only what `@jiscribe/canvas/fonts.css` ships keeps the
 * measurement and the drawing on the same face. The field itself stays a free
 * string, so a doc naming something else still loads and still draws.
 *
 * `sans` / `serif` / `mono` take their Latin from the Source family, which is
 * where the Latin in Source Han Sans / Source Han Serif (shipped as the Noto JP
 * faces behind them) comes from — so each pair agrees on weight and vertical
 * metrics rather than merely coexisting. `hand` has no such pairing to draw on:
 * no JP handwriting face ships a Latin companion.
 */
export const CANVAS_FONT_FAMILIES: readonly CanvasFontFamily[] = [
	{ id: "sans", stack: SANS_STACK },
	{ id: "serif", stack: '"Source Serif 4", "Noto Serif JP", serif' },
	{ id: "mono", stack: '"Source Code Pro", "Noto Sans JP", monospace' },
	{ id: "hand", stack: 'Caveat, "Klee One", cursive' },
];
