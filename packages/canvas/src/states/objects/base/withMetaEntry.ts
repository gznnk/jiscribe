import type { MetaState } from "./MetaState";
import { rebrand } from "../utils/rebrand";

/**
 * The object's `meta` with one entry stated or dropped, built fresh rather than
 * written into `srcMeta` — doc and state share the meta object by reference (see
 * MetaMapper), so an in-place edit would reach the document behind the reducer's
 * back.
 *
 * @param srcMeta - The meta to start from; undefined for an object without one
 * @param key - The entry to state
 * @param value - The value to state, or undefined to drop the entry
 * @returns The updated meta, or undefined once the last entry is gone — an object that carries nothing carries no `meta` either, which is the shape the parser produces for a document without one
 */
export const withMetaEntry = (
	srcMeta: MetaState | undefined,
	key: string,
	value: unknown,
): MetaState | undefined => {
	const updatedEntries: Record<string, unknown> = { ...srcMeta };
	if (value === undefined) {
		delete updatedEntries[key];
	} else {
		updatedEntries[key] = value;
	}
	if (Object.keys(updatedEntries).length === 0) {
		return undefined;
	}
	return rebrand<MetaState>(updatedEntries);
};
