import type { StyleTable } from "@jiscribe/canvas-sdk";
import { fieldEntry } from "@jiscribe/canvas-sdk";

import type { BraceState } from "../state/brace/BraceState";
import type { BracketState } from "../state/bracket/BracketState";

/**
 * What a marker with a movable tip answers for beyond its features, so a host
 * can drive both fields through `onStyleIntent` — there is no built-in menu
 * section for them, the tip handle covering both (definitions.ts).
 *
 * Both fields are in those types' `extraKeys`, which is what registration checks
 * the entries against; a marker whose tip is pinned takes
 * {@link GROUP_MARKER_DIRECTION_STYLE_ENTRIES} instead, its doc holding no
 * `tipPosition` at all.
 */
export const GROUP_MARKER_TIP_STYLE_ENTRIES = {
	direction: fieldEntry("direction", "string"),
	tipPosition: fieldEntry("tipPosition", "number"),
} satisfies StyleTable<BraceState>;

/** The same, for a marker whose tip is pinned to the middle of the span. */
export const GROUP_MARKER_DIRECTION_STYLE_ENTRIES = {
	direction: GROUP_MARKER_TIP_STYLE_ENTRIES.direction,
} satisfies StyleTable<BracketState>;
