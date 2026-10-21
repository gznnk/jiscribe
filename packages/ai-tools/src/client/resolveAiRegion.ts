// Reads the region arguments capture_canvas and fit_view share into one
// decision. It only checks the arguments against each other; whether the
// selection is empty or the ids draw anything takes a canvas, so each caller
// asks that itself.

import type { Rect } from "@jiscribe/geometry";

import type { AiRegionArgs } from "../canvasOps";

/** Which region the arguments name; "none" is nothing given, and what that means is up to the tool */
export type AiResolvedRegion =
	| { kind: "none" }
	| { kind: "all" }
	| { kind: "selection" }
	| { kind: "ids"; ids: readonly string[] }
	| { kind: "rect"; rect: Rect };

/** The region named, or the error text for the AI when the arguments contradict each other */
export type AiRegionResolution =
	{ ok: true; region: AiResolvedRegion } | { ok: false; text: string };

/**
 * Reads which region the arguments name.
 *
 * @param args - The region arguments as the tool received them; an empty `ids`
 *   is taken as given (the tool schema already refuses it)
 * @returns ok=false when more than one of target / ids / rect is given
 */
export const resolveAiRegion = (args: AiRegionArgs): AiRegionResolution => {
	const { target, ids, rect } = args;
	const givenCount = [target, ids, rect].filter(
		(field) => field !== undefined,
	).length;
	if (givenCount > 1) {
		return {
			ok: false,
			text: 'give at most one of target, ids and rect: target takes what the canvas holds ("all" or "selection"), ids the objects you name, and rect the world region you name',
		};
	}
	if (target !== undefined) {
		return { ok: true, region: { kind: target } };
	}
	if (ids !== undefined) {
		return { ok: true, region: { kind: "ids", ids } };
	}
	if (rect !== undefined) {
		return { ok: true, region: { kind: "rect", rect } };
	}
	return { ok: true, region: { kind: "none" } };
};
