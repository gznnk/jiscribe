import { isArray, isObject, isString } from "@jiscribe/basic-validators";

import { dropEmptiedGroup, stripObjectNode } from "./stripObjectNode";
import { stripUnknownViewFields } from "./stripUnknownViewFields";
import type { SemanticDiagnostic } from "../../model/types/SemanticDiagnostic";
import type { ObjectDocValidatorRegistry } from "../../registries/ObjectDocValidatorRegistry";
import type { ObjectTreeNode } from "../utils/mapObjectTree";
import { mapObjectTree } from "../utils/mapObjectTree";

export type StripUnknownContentResult = {
	/** The input with unknown content removed (the input itself when nothing was removed). */
	data: unknown;
	/** One diagnostic per removed object or field and per opaque object kept, in document order. */
	warnings: SemanticDiagnostic[];
};

/**
 * Id of the object an endpoint is owned by, when that object is one the strip
 * removed — the connector then has a dangling reference and goes with it.
 */
const findRemovedOwnerId = (
	endpoint: unknown,
	removedIds: ReadonlySet<string>,
): string | undefined => {
	if (!isObject(endpoint)) {
		return undefined;
	}
	const owner = endpoint.owner;
	if (!isObject(owner)) {
		return undefined;
	}
	const ownerId = owner.id;
	return isString(ownerId) && removedIds.has(ownerId) ? ownerId : undefined;
};

/**
 * Removes unknown content from a candidate document before structure validation, so
 * the rest of the document still displays, and since saving re-serializes the
 * stripped doc, the removed content disappears on save. Unknown means:
 *   - objects whose `type` is not registered in the registry and that carry no id
 *   - pure-enum fields holding a string outside the known set, at any nesting depth
 *     (flat, connector label, text slots, …; see `stripUnknownEnumValues`)
 *   - connectors with an endpoint anchored to an unknown kind (see
 *     `findUnknownAnchorKind`); the anchor is not droppable on its own
 *   - a document-root `view.open` / `view.scroll` naming a mode outside the known
 *     set (see {@link stripUnknownViewFields})
 *
 * "Unknown" always means a member outside a closed set, never a value of the wrong
 * type: one of those is left in place for its own validator to reject, so
 * corruption is not turned into a warning.
 *
 * An object of an unregistered type that does carry an id is not removed: it stays
 * in place as an opaque object (`OpaqueObjectDoc`), untouched inside, with a
 * warning saying so, and the editors write it back as it is.
 *
 * Object removal cascades to keep the remaining doc valid:
 *   - a group whose children all get removed is removed with them (an empty group
 *     is rejected by checkStructure as corruption; see {@link dropEmptiedGroup})
 *   - a connector whose endpoint owner was removed is removed with it (a dangling
 *     reference is rejected by checkSemantics)
 *
 * Entries that are not objects or whose `type` is not a string are left in place —
 * those are corruption, and checkStructure reports them as errors.
 *
 * @param data - The JSON.parse result of a candidate document. Anything without an
 *   object shape and a `root` array is returned unchanged (no warnings).
 * @param registry - Decides which types are known via `hasType`.
 * @returns The (possibly) stripped data and a warning per removed object or field
 *   and per opaque object kept.
 *   Warning paths use the input's indices, so they point into the text the user sees.
 */
export function stripUnknownContent(
	data: unknown,
	registry: ObjectDocValidatorRegistry,
): StripUnknownContentResult {
	if (!isObject(data)) {
		return { data, warnings: [] };
	}
	if (!isArray(data.root)) {
		return { data, warnings: [] };
	}

	const warnings: SemanticDiagnostic[] = [];
	const strippedView = stripUnknownViewFields(data.view);
	warnings.push(...strippedView.warnings);

	// IDs of every removed object, descendants included, for the connector cascade.
	const removedIds = new Set<string>();
	// Diagnostic path of every connector the walk kept, keyed by the node itself: the
	// cascade below reports a dropped connector at its index in the input, and the
	// walked array has already closed the gaps left by removed entries.
	const pathByKeptConnector = new Map<ObjectTreeNode, string>();

	// The hooks are where every finding of the walk is gathered, and the only place
	// this function accumulates: each calls a helper that returns what it found.
	const strippedRoot = mapObjectTree(data.root, "root", {
		enter: (node, path) => {
			const stripped = stripObjectNode(node, path, registry);
			warnings.push(...stripped.warnings);
			stripped.removedIds.forEach((removedId) => removedIds.add(removedId));
			if (stripped.node !== undefined && stripped.node.type === "connector") {
				pathByKeptConnector.set(stripped.node, path);
			}
			return stripped.node;
		},
		leave: (node, path) => {
			const kept = dropEmptiedGroup(node, path);
			warnings.push(...kept.warnings);
			kept.removedIds.forEach((removedId) => removedIds.add(removedId));
			return kept.node;
		},
	}) as unknown[];

	if (warnings.length === 0) {
		return { data, warnings };
	}

	const keptRoot: unknown[] = [];
	strippedRoot.forEach((node) => {
		if (isObject(node)) {
			const connectorPath = pathByKeptConnector.get(node);
			if (connectorPath !== undefined) {
				const ownerId =
					findRemovedOwnerId(node.source, removedIds) ??
					findRemovedOwnerId(node.target, removedIds);
				if (ownerId !== undefined) {
					const id = node.id;
					warnings.push({
						path: connectorPath,
						message: `Endpoint owner "${ownerId}" had an unknown object type: the connector was dropped with it.`,
						severity: "warning",
						...(isString(id) ? { id } : {}),
					});
					return;
				}
			}
		}
		keptRoot.push(node);
	});

	return {
		// `view` is already carried by the spread; it is re-set only when the strip
		// above actually replaced it.
		data: {
			...data,
			...(strippedView.view !== data.view ? { view: strippedView.view } : {}),
			root: keptRoot,
		},
		warnings,
	};
}
