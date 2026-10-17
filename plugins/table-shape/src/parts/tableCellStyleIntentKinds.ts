import { TEXT_STYLE_INTENT_KINDS } from "@jiscribe/canvas-sdk";

/**
 * What a pick of cells receives, whether picked as cells or as whole rows or
 * columns: their text and their fill (tableFillEntry). Fill opacity is not among
 * them, being the table background's alone.
 */
export const TABLE_CELL_STYLE_INTENT_KINDS: ReadonlySet<string> = new Set([
	...TEXT_STYLE_INTENT_KINDS,
	"fill",
]);
