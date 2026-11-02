import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../../model/objects/base/ObjectDoc";

/**
 * Hands out a `${prefix}-N` id, N being the lowest number free in the document and among
 * the ids this allocator has already handed out.
 */
export type AllocateId = (prefix: string) => string;

/**
 * Start allocating ids for one op, the document's ids being collected once, here.
 *
 * Every id handed out counts as used from then on, so a batch staging several objects
 * before pushing any never repeats one. The scan for each prefix resumes where the last
 * one stopped, which finds the same id a scan from 1 would, as used ids only ever grow.
 *
 * @param doc - Read once, now; an object pushed to `doc.root` afterwards is invisible to
 *   the allocator, so use a fresh one per op
 */
export const createIdAllocator = (doc: CanvasDoc): AllocateId => {
	const usedIds = collectIds(doc.root);
	const nextIndexByPrefix = new Map<string, number>();
	return (prefix) => {
		let index = nextIndexByPrefix.get(prefix) ?? 1;
		while (usedIds.has(`${prefix}-${index}`)) {
			index += 1;
		}
		const allocatedId = `${prefix}-${index}`;
		usedIds.add(allocatedId);
		nextIndexByPrefix.set(prefix, index + 1);
		return allocatedId;
	};
};

/** Collect existing ids, recursing through group children. */
const collectIds = (objects: ObjectDoc[]): Set<string> => {
	const ids = new Set<string>();
	const visit = (object: Record<string, unknown>): void => {
		if (typeof object.id === "string") {
			ids.add(object.id);
		}
		if (Array.isArray(object.children)) {
			for (const child of object.children) {
				if (typeof child === "object" && child !== null) {
					visit(child as Record<string, unknown>);
				}
			}
		}
	};
	for (const object of objects) {
		visit(object as unknown as Record<string, unknown>);
	}
	return ids;
};
