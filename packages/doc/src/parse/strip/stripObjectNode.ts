import { isArray, isString } from "@jiscribe/basic-validators";

import { collectRemovedIds } from "./collectRemovedIds";
import { findUnknownAnchorKind } from "./findUnknownAnchorKind";
import { stripUnknownEnumValues } from "./stripUnknownEnumValues";
import type { SemanticDiagnostic } from "../../model/types/SemanticDiagnostic";
import type { ObjectDocValidatorRegistry } from "../../registries/ObjectDocValidatorRegistry";
import type { ObjectTreeNode } from "../utils/mapObjectTree";

export type StripObjectNodeResult = {
	/** The node to keep, or undefined when the object itself is removed. */
	node: ObjectTreeNode | undefined;
	/** One diagnostic per removed field or object and per opaque object kept. */
	warnings: readonly SemanticDiagnostic[];
	/** Ids the removal took out of the document, descendants included, for the connector cascade. */
	removedIds: readonly string[];
};

/** Shared so a node with nothing to report is answered without an allocation. */
const noWarnings: readonly SemanticDiagnostic[] = [];
const noRemovedIds: readonly string[] = [];

/**
 * Strips one object node, before its children are walked: an unknown type turns it
 * opaque or removes it, an unknown anchor kind removes the connector, and what
 * survives has its unknown pure-enum values dropped.
 *
 * @param node - The node as it came in; its `children` are neither read nor copied
 * @param path - Diagnostic path of the node itself (`root[0].children[1]`)
 * @param registry - Decides which types are known via `hasType`
 * @returns The node to keep or undefined when it is removed, the warnings it earned,
 *   and the ids a removal took out of the document
 */
export const stripObjectNode = (
	node: ObjectTreeNode,
	path: string,
	registry: ObjectDocValidatorRegistry,
): StripObjectNodeResult => {
	const type = node.type;
	if (!isString(type)) {
		return { node, warnings: noWarnings, removedIds: noRemovedIds };
	}
	const id = node.id;

	if (!registry.hasType(type)) {
		// Kept verbatim as an opaque object: nothing inside it is read, so its
		// enum values are not ours to strip and its children are not walked.
		// Only an id makes it something the rest of the document can refer to
		// and the editors can keep in place, so one without is still removed.
		if (isString(id) && id.length > 0) {
			return {
				node,
				warnings: [
					{
						path: `${path}.type`,
						message: `Object type "${type}" is not a type this build knows: the object is kept as it is but not drawn.`,
						severity: "warning",
						id,
					},
				],
				removedIds: noRemovedIds,
			};
		}
		return {
			node: undefined,
			warnings: [
				{
					path: `${path}.type`,
					message: `Unknown object type "${type}" on an object without an id: the object was ignored and will be dropped on save.`,
					severity: "warning",
				},
			],
			removedIds: collectRemovedIds(node),
		};
	}

	// An unknown anchor kind cannot be dropped field-wise the way a pure enum can:
	// the anchor is what positions the endpoint (the free anchor even carries the
	// coordinates), so an endpoint without a usable one has no meaning. The unit
	// that gets removed is therefore the connector, matching the removed-owner
	// cascade the caller runs. Checked before the enum strip so a connector on its
	// way out does not also emit warnings about its own fields.
	if (type === "connector") {
		const unknownAnchor = findUnknownAnchorKind(node);
		if (unknownAnchor !== undefined) {
			return {
				node: undefined,
				warnings: [
					{
						path: `${path}.${unknownAnchor.endpoint}.anchor.kind`,
						message: `Unknown anchor kind "${unknownAnchor.kind}": the connector was ignored and will be dropped on save.`,
						severity: "warning",
						...(isString(id) ? { id } : {}),
					},
				],
				removedIds: noRemovedIds,
			};
		}
	}

	const enumStripped = stripUnknownEnumValues(
		node,
		path,
		isString(id) ? id : undefined,
	);
	return {
		node: enumStripped.node,
		warnings: enumStripped.warnings,
		removedIds: noRemovedIds,
	};
};

/**
 * Removes a group whose children were all removed, after the walk replaced them: an
 * empty group is rejected by checkStructure as corruption, so the group goes with
 * them. Reached only for a node the walk descended into (mapObjectTree's `leave`),
 * so an empty `children` here is the walk's doing — a group authored empty is never
 * descended into, and stays for checkStructure to report.
 *
 * @param node - The node holding its walked children
 * @param path - Diagnostic path of the node itself, which the warning points at as it is
 * @returns The node to keep or undefined when the group is dropped, its warning, and
 *   its own id for the connector cascade (its children added theirs when they went)
 */
export const dropEmptiedGroup = (
	node: ObjectTreeNode,
	path: string,
): StripObjectNodeResult => {
	if (
		node.type !== "group" ||
		!isArray(node.children) ||
		node.children.length > 0
	) {
		return { node, warnings: noWarnings, removedIds: noRemovedIds };
	}
	const id = node.id;
	return {
		node: undefined,
		warnings: [
			{
				path,
				message:
					"All children had unknown object types and no id: the group was dropped with them.",
				severity: "warning",
				...(isString(id) ? { id } : {}),
			},
		],
		removedIds: isString(id) ? [id] : noRemovedIds,
	};
};
