import { isArray, isObject, isString } from "@workspace/basic-validators";

import type { SemanticDiagnostic } from "./types";
import type { createObjectDocValidatorRegistry } from "../../registry/ObjectDocValidatorRegistry";

type ObjectDocValidatorRegistry = ReturnType<
	typeof createObjectDocValidatorRegistry
>;

export type StripUnknownObjectsResult = {
	/** The input with unknown-type objects removed (the input itself when nothing was removed). */
	data: unknown;
	/** One diagnostic per removed object, in document order. */
	warnings: SemanticDiagnostic[];
};

/**
 * Removes objects whose `type` is not registered in the registry, before structure
 * validation. An unknown type is not an error: the object is dropped so the rest of
 * the document still displays, and since saving re-serializes the stripped doc, it
 * disappears on save.
 *
 * Removal cascades to keep the remaining doc valid:
 *   - a group whose children all get removed is removed with them (an empty group
 *     is rejected by validateStructure as corruption)
 *   - a connector whose endpoint owner was removed is removed with it (a dangling
 *     reference is rejected by validateSemantics)
 *
 * Entries that are not objects or whose `type` is not a string are left in place —
 * those are corruption, and validateStructure reports them as errors.
 *
 * @param data - The JSON.parse result of a candidate document. Anything without an
 *   object shape and a `root` array is returned unchanged (no warnings).
 * @param registry - Decides which types are known via `getFeatures`.
 * @returns The (possibly) stripped data and a warning per removed object. Warning
 *   paths use the input's indices, so they point into the text the user sees.
 */
export function stripUnknownObjects(
	data: unknown,
	registry: ObjectDocValidatorRegistry,
): StripUnknownObjectsResult {
	if (!isObject(data)) {
		return { data, warnings: [] };
	}
	const d = data as Record<string, unknown>;
	if (!isArray(d.root)) {
		return { data, warnings: [] };
	}

	const warnings: SemanticDiagnostic[] = [];
	// IDs of every removed object, descendants included, for the connector cascade.
	const removedIds = new Set<string>();

	const collectRemovedIds = (node: unknown): void => {
		if (!isObject(node)) {
			return;
		}
		const o = node as Record<string, unknown>;
		if (isString(o.id)) {
			removedIds.add(o.id);
		}
		// Unknown types have no known structure, so descend into any `children`
		// array generically rather than only into known groups.
		if (isArray(o.children)) {
			(o.children as unknown[]).forEach(collectRemovedIds);
		}
	};

	// Returns the node (possibly with stripped children), or undefined when removed.
	const stripNode = (node: unknown, path: string): unknown => {
		if (!isObject(node)) {
			return node;
		}
		const o = node as Record<string, unknown>;
		if (!isString(o.type)) {
			return node;
		}

		if (registry.getFeatures(o.type as string) === undefined) {
			collectRemovedIds(o);
			warnings.push({
				path: `${path}.type`,
				message: `Unknown object type "${o.type as string}": the object was ignored and will be dropped on save.`,
				...(isString(o.id) ? { id: o.id as string } : {}),
			});
			return undefined;
		}

		if (
			o.type === "group" &&
			isArray(o.children) &&
			(o.children as unknown[]).length > 0
		) {
			const strippedChildren = (o.children as unknown[])
				.map((child, i) => stripNode(child, `${path}.children[${i}]`))
				.filter((child) => child !== undefined);
			if (strippedChildren.length === 0) {
				if (isString(o.id)) {
					removedIds.add(o.id);
				}
				warnings.push({
					path,
					message:
						"All children had unknown object types: the group was dropped with them.",
					...(isString(o.id) ? { id: o.id as string } : {}),
				});
				return undefined;
			}
			return { ...o, children: strippedChildren };
		}

		return node;
	};

	const strippedEntries = (d.root as unknown[]).map((node, i) =>
		stripNode(node, `root[${i}]`),
	);

	if (warnings.length === 0) {
		return { data, warnings };
	}

	const removedOwnerId = (endpoint: unknown): string | undefined => {
		if (!isObject(endpoint)) {
			return undefined;
		}
		const owner = (endpoint as Record<string, unknown>).owner;
		if (!isObject(owner)) {
			return undefined;
		}
		const ownerId = (owner as Record<string, unknown>).id;
		return isString(ownerId) && removedIds.has(ownerId as string)
			? (ownerId as string)
			: undefined;
	};

	const strippedRoot: unknown[] = [];
	strippedEntries.forEach((node, i) => {
		if (node === undefined) {
			return;
		}
		if (
			isObject(node) &&
			(node as Record<string, unknown>).type === "connector"
		) {
			const o = node as Record<string, unknown>;
			const ownerId = removedOwnerId(o.source) ?? removedOwnerId(o.target);
			if (ownerId !== undefined) {
				warnings.push({
					path: `root[${i}]`,
					message: `Endpoint owner "${ownerId}" had an unknown object type: the connector was dropped with it.`,
					...(isString(o.id) ? { id: o.id as string } : {}),
				});
				return;
			}
		}
		strippedRoot.push(node);
	});

	return { data: { ...d, root: strippedRoot }, warnings };
}
