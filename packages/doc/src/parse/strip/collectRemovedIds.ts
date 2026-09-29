import { isArray, isObject, isString } from "@jiscribe/basic-validators";

/**
 * Collects the ids a removal takes out of the document: the node's own and every
 * one below it, so the connector cascade can drop what referred to any of them.
 *
 * @param node - The node being removed; anything without an object shape yields no id
 * @returns The ids in document order, duplicates included — the caller keeps the set
 */
export const collectRemovedIds = (node: unknown): string[] => {
	if (!isObject(node)) {
		return [];
	}
	const ids: string[] = [];
	if (isString(node.id)) {
		ids.push(node.id);
	}
	// Unknown types have no known structure, so descend into any `children` array
	// generically rather than only into known groups.
	const children = node.children;
	if (isArray(children)) {
		children.forEach((child) => {
			ids.push(...collectRemovedIds(child));
		});
	}
	return ids;
};
