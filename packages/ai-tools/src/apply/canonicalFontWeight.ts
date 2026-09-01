// The one place a weight an AI wrote reaches its canonical form before it is
// stored. The tool declaration lets a model write the numeric weights it copies
// out of a design token, but the document keeps only "normal" / "bold" for those
// two rungs — the UI's bold toggle matches on those spellings — so the mapping
// has to happen on the applying side, which every transport goes through
// (jiscribe-mcp, studio and desktop all apply through applyCanvasOp).

import type { AiDocOp } from "../canvasOps";

/**
 * The numeric weights that name a rung the document spells out in words, and the
 * spelling it keeps. The middle rungs ("500" / "600") have no other spelling and
 * are stored as they arrive.
 */
const FONT_WEIGHT_ALIASES: Readonly<Record<string, string>> = {
	"400": "normal",
	"700": "bold",
};

/**
 * The same style bag with an aliased weight rewritten. The bag itself is
 * returned untouched when there is nothing to rewrite, so no property is added
 * where the caller gave none.
 */
const withCanonicalFontWeight = <Style extends { fontWeight?: string }>(
	style: Style,
): Style => {
	const canonical =
		style.fontWeight === undefined
			? undefined
			: FONT_WEIGHT_ALIASES[style.fontWeight];
	return canonical === undefined ? style : { ...style, fontWeight: canonical };
};

/**
 * Rewrites every weight an operation carries into the spelling the document
 * keeps, so "400" and "700" never reach a stored object.
 *
 * @param op - The operation about to be applied; one that carries no weight at
 *   all comes back as it is
 * @returns The operation to apply, the same object when nothing was aliased
 */
export const canonicalizeFontWeights = (op: AiDocOp): AiDocOp => {
	switch (op.kind) {
		case "addObject":
			return withCanonicalFontWeight(op);
		case "addObjects":
			return { ...op, objects: op.objects.map(withCanonicalFontWeight) };
		case "setStyle":
			return { ...op, style: withCanonicalFontWeight(op.style) };
		case "setTextStyle":
			return withCanonicalFontWeight(op);
		case "setTextStyles":
			return { ...op, entries: op.entries.map(withCanonicalFontWeight) };
		default:
			return op;
	}
};
