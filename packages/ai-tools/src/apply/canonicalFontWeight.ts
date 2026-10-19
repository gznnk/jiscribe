// Where a weight a built-in tool's op carries reaches its canonical form before it
// is stored. The tool declaration lets a model write the numeric weights it copies
// out of a design token, but the document keeps only "normal" / "bold" for those
// two rungs — the UI's bold toggle matches on those spellings — so the mapping
// has to happen on the applying side, which every transport goes through
// (jiscribe-mcp, studio and desktop all apply through applyCanvasOp). The mapping
// itself is canonicalizeFontWeight, which a plugin's object tool applies to its own
// arguments (its op carries no style this could reach).

import { canonicalizeFontWeight } from "@jiscribe/ai-tools-sdk";

import type { AiDocOp } from "../canvasOps";

/**
 * The same style bag with an aliased weight rewritten. The bag itself is
 * returned untouched when there is nothing to rewrite, so no property is added
 * where the caller gave none.
 */
const withCanonicalFontWeight = <Style extends { fontWeight?: string }>(
	style: Style,
): Style => {
	if (style.fontWeight === undefined) {
		return style;
	}
	const canonical = canonicalizeFontWeight(style.fontWeight);
	return canonical === style.fontWeight
		? style
		: { ...style, fontWeight: canonical };
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
