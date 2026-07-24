import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";

/** root ツリー全体で重複しない id を `${prefix}-N` 形式で採番する。 */
export function generateUniqueId(doc: CanvasDoc, prefix: string): string {
	const usedIds = collectIds(doc.root);
	let index = 1;
	while (usedIds.has(`${prefix}-${index}`)) {
		index += 1;
	}
	return `${prefix}-${index}`;
}

/** group の children まで再帰して既存 id を集める。 */
function collectIds(objects: ObjectDoc[]): Set<string> {
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
}
