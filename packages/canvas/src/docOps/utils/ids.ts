import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";

/**
 * Allocate a `${prefix}-N` id unique across the whole root tree.
 *
 * @param doc - Read-only here; only `doc.root` is scanned, so an object not yet pushed is
 *   invisible to the scan
 * @param prefix - Leading segment of the id, conventionally the object type name
 * @param reservedIds - Ids to avoid on top of the ones in the tree, for a batch that stages
 *   several objects before pushing any; omitted means the tree alone decides
 */
export const generateUniqueId = (
	doc: CanvasDoc,
	prefix: string,
	reservedIds?: ReadonlySet<string>,
): string => {
	const usedIds = collectIds(doc.root);
	let index = 1;
	while (
		usedIds.has(`${prefix}-${index}`) ||
		reservedIds?.has(`${prefix}-${index}`) === true
	) {
		index += 1;
	}
	return `${prefix}-${index}`;
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
