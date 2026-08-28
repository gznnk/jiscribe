import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * The ids an edit added, removed or replaced, found by comparing the two object
 * maps entry by entry **by reference**.
 *
 * Reference equality is exact here rather than an approximation: every state
 * update path replaces the objects it touches and carries the rest over as they
 * are (see `cowObjects`), so an object that came out of an edit as the very
 * instance that went in was not written to. That makes the comparison O(N)
 * pointer checks with no structural walk — cheap enough to run on every commit.
 *
 * It only holds between two states on the same edit chain. Objects rebuilt from
 * a doc (`canvasToState`) are all new instances, so diffing a restored state
 * against a live one reports everything as changed; that is what the recorded
 * ids exist to avoid.
 *
 * @param before - The object map before the edit
 * @param after - The object map after it
 * @returns The changed ids, `before`'s order first (so a deletion reads in the
 *   order the document had) and then whatever `after` added
 */
export const diffChangedObjectIds = (
	before: Record<string, ObjectState>,
	after: Record<string, ObjectState>,
): string[] => {
	const changed: string[] = [];

	for (const id of Object.keys(before)) {
		if (before[id] !== after[id]) {
			changed.push(id);
		}
	}
	for (const id of Object.keys(after)) {
		if (!(id in before)) {
			changed.push(id);
		}
	}

	return changed;
};
