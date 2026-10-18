import { ER_ENTITY_COLUMN_FIELDS } from "../schema/ErEntityDoc";
import type { ErEntityColumnField } from "../schema/ErEntityDoc";

/**
 * One of the entity's three vertical lanes: every row's key, every row's name,
 * or every row's type, top to bottom. Named by the field it runs down, and the
 * same word is its part id. Not a "column": in this package a column is one
 * attribute row (erEntityColumnPartId).
 */
export type ErEntityLane = ErEntityColumnField;

/** The lanes left to right, which is the order a lane range runs over. */
export const ER_ENTITY_LANES: readonly ErEntityLane[] = ER_ENTITY_COLUMN_FIELDS;

/**
 * The lane one part id names; the part id is the lane's own name.
 *
 * @param partId - The id to read, or undefined for a grip whose action carries no part segment; a slot id such as `col:2:name` is refused rather than read as its lane
 * @returns The lane, or null when the text is not one
 */
export const parseErEntityLanePartId = (
	partId: string | undefined,
): ErEntityLane | null =>
	ER_ENTITY_LANES.find((lane) => lane === partId) ?? null;
