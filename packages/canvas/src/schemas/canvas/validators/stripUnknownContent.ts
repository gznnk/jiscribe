import { isArray, isObject, isString } from "@jiscribe/basic-validators";

import type { SemanticDiagnostic } from "./types";
import { isArrowType } from "../../objects/types/ArrowType";
import { isConnectorRouting } from "../../objects/types/ConnectorRouting";
import { isAnchorKind } from "../../objects/types/EndpointRef";
import { isStrokeDashType } from "../../objects/types/StrokeDashType";
import { isTextAlign } from "../../objects/types/TextAlign";
import { isVerticalAlign } from "../../objects/types/VerticalAlign";
import type { createObjectDocValidatorRegistry } from "../../registry/ObjectDocValidatorRegistry";

type ObjectDocValidatorRegistry = ReturnType<
	typeof createObjectDocValidatorRegistry
>;

export type StripUnknownContentResult = {
	/** The input with unknown content removed (the input itself when nothing was removed). */
	data: unknown;
	/** One diagnostic per removed object or field, in document order. */
	warnings: SemanticDiagnostic[];
};

/**
 * Pure-enum doc fields: dropping an unknown value just falls back to the default
 * rendering, so it is stripped instead of rejected. Sanitization checks
 * (isCssSafeValue) and numeric range checks are deliberately NOT here — an unsafe
 * or out-of-range value stays a hard error.
 */
const pureEnumFields: ReadonlyMap<string, (value: unknown) => boolean> =
	new Map<string, (value: unknown) => boolean>([
		["startArrow", isArrowType],
		["endArrow", isArrowType],
		["strokeDashType", isStrokeDashType],
		["textAlign", isTextAlign],
		["verticalAlign", isVerticalAlign],
		["routing", isConnectorRouting],
	]);

/**
 * Finds the first endpoint of a connector doc whose anchor names a kind outside the
 * known set. A missing anchor or a non-string kind is corruption rather than an
 * unknown value, so it is passed over and left to validateConnectorDoc. A known kind
 * in the wrong position (an owned endpoint anchored "free") is likewise not unknown.
 */
const findUnknownAnchorKind = (
	connector: Record<string, unknown>,
): { endpoint: "source" | "target"; kind: string } | undefined => {
	for (const endpoint of ["source", "target"] as const) {
		const ref = connector[endpoint];
		if (!isObject(ref)) {
			continue;
		}
		const anchor = (ref as Record<string, unknown>).anchor;
		if (!isObject(anchor)) {
			continue;
		}
		const kind = (anchor as Record<string, unknown>).kind;
		if (isString(kind) && !isAnchorKind(kind)) {
			return { endpoint, kind: kind as string };
		}
	}
	return undefined;
};

/**
 * Removes unknown content from a candidate document before structure validation, so
 * the rest of the document still displays, and since saving re-serializes the
 * stripped doc, the removed content disappears on save. Unknown means:
 *   - objects whose `type` is not registered in the registry
 *   - pure-enum fields (see {@link pureEnumFields}) holding a value outside the
 *     known set, at any nesting depth (flat, connector label, text slots, …)
 *   - connectors with an endpoint anchored to an unknown kind (see
 *     {@link findUnknownAnchorKind}); the anchor is not droppable on its own
 *
 * Object removal cascades to keep the remaining doc valid:
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
 * @returns The (possibly) stripped data and a warning per removed object or field.
 *   Warning paths use the input's indices, so they point into the text the user sees.
 */
export function stripUnknownContent(
	data: unknown,
	registry: ObjectDocValidatorRegistry,
): StripUnknownContentResult {
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

	// Allocation-free detection of an unknown pure-enum value anywhere in the
	// subtree (`children` excluded — stripNode scans each child itself). Parsing
	// runs per text edit in the VSCode host, so the common all-valid document must
	// not pay the copying walk below; this scan is what lets it exit with reads only.
	const containsUnknownEnumValue = (value: unknown): boolean => {
		if (isArray(value)) {
			return (value as unknown[]).some(containsUnknownEnumValue);
		}
		if (!isObject(value)) {
			return false;
		}
		const o = value as Record<string, unknown>;
		for (const key in o) {
			if (key === "children") {
				continue;
			}
			const isKnownEnumValue = pureEnumFields.get(key);
			if (isKnownEnumValue !== undefined && !isKnownEnumValue(o[key])) {
				return true;
			}
			if (containsUnknownEnumValue(o[key])) {
				return true;
			}
		}
		return false;
	};

	// Removes unknown pure-enum values at any depth of a node (flat fields, the
	// connector label, text slots, …). Structural recursion into group children is
	// owned by stripNode, so `children` is passed through untouched here. Returns
	// the input itself when nothing was removed; subtrees are copied only along
	// paths where the scan above found something to drop.
	const stripEnumFields = (
		value: unknown,
		path: string,
		ownerId: string | undefined,
	): unknown => {
		if (!containsUnknownEnumValue(value)) {
			return value;
		}
		if (isArray(value)) {
			let changed = false;
			const strippedElements = (value as unknown[]).map((element, i) => {
				const strippedElement = stripEnumFields(
					element,
					`${path}[${i}]`,
					ownerId,
				);
				changed = changed || strippedElement !== element;
				return strippedElement;
			});
			return changed ? strippedElements : value;
		}
		if (!isObject(value)) {
			return value;
		}
		const o = value as Record<string, unknown>;
		let changed = false;
		const stripped: Record<string, unknown> = {};
		Object.entries(o).forEach(([key, propValue]) => {
			if (key === "children") {
				stripped[key] = propValue;
				return;
			}
			const isKnownEnumValue = pureEnumFields.get(key);
			if (isKnownEnumValue !== undefined && !isKnownEnumValue(propValue)) {
				const shownValue =
					typeof propValue === "string" ? ` "${propValue}"` : "";
				warnings.push({
					path: `${path}.${key}`,
					message: `Unknown ${key} value${shownValue}: the field was ignored and will be dropped on save.`,
					...(ownerId !== undefined ? { id: ownerId } : {}),
				});
				changed = true;
				return;
			}
			const strippedProp = stripEnumFields(
				propValue,
				`${path}.${key}`,
				ownerId,
			);
			changed = changed || strippedProp !== propValue;
			stripped[key] = strippedProp;
		});
		return changed ? stripped : value;
	};

	// Returns the node (possibly with stripped children/fields), or undefined when removed.
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

		// An unknown anchor kind cannot be dropped field-wise the way a pure enum can:
		// the anchor is what positions the endpoint (the free anchor even carries the
		// coordinates), so an endpoint without a usable one has no meaning. The unit
		// that gets removed is therefore the connector, matching the removed-owner
		// cascade below. Checked before the enum strip so a connector on its way out
		// does not also emit warnings about its own fields.
		if (o.type === "connector") {
			const unknownAnchor = findUnknownAnchorKind(o);
			if (unknownAnchor !== undefined) {
				warnings.push({
					path: `${path}.${unknownAnchor.endpoint}.anchor.kind`,
					message: `Unknown anchor kind "${unknownAnchor.kind}": the connector was ignored and will be dropped on save.`,
					...(isString(o.id) ? { id: o.id as string } : {}),
				});
				return undefined;
			}
		}

		const enumStripped = stripEnumFields(
			o,
			path,
			isString(o.id) ? (o.id as string) : undefined,
		) as Record<string, unknown>;

		if (
			enumStripped.type === "group" &&
			isArray(enumStripped.children) &&
			(enumStripped.children as unknown[]).length > 0
		) {
			const strippedChildren = (enumStripped.children as unknown[])
				.map((child, i) => stripNode(child, `${path}.children[${i}]`))
				.filter((child) => child !== undefined);
			if (strippedChildren.length === 0) {
				if (isString(enumStripped.id)) {
					removedIds.add(enumStripped.id as string);
				}
				warnings.push({
					path,
					message:
						"All children had unknown object types: the group was dropped with them.",
					...(isString(enumStripped.id)
						? { id: enumStripped.id as string }
						: {}),
				});
				return undefined;
			}
			return { ...enumStripped, children: strippedChildren };
		}

		return enumStripped;
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
