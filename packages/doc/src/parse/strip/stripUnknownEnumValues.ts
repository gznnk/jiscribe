import { isArray, isObject, isString } from "@jiscribe/basic-validators";

import { isArrowType } from "../../model/objects/types/ArrowType";
import { isConnectorRouting } from "../../model/objects/types/ConnectorRouting";
import { isStrokeDashType } from "../../model/objects/types/StrokeDashType";
import { isTextAlign } from "../../model/objects/types/text/TextAlign";
import { isTextLayout } from "../../model/objects/types/text/TextLayout";
import { isTextVerticalBasis } from "../../model/objects/types/text/TextVerticalBasis";
import { isVerticalAlign } from "../../model/objects/types/text/VerticalAlign";
import type { SemanticDiagnostic } from "../../model/types/SemanticDiagnostic";
import type { ObjectTreeNode } from "../utils/mapObjectTree";

/**
 * Pure-enum doc fields: dropping a string outside the known set just falls back to
 * the default rendering, so such a value is stripped instead of rejected — a
 * document written for a newer build still opens. Only a string is stripped: a
 * value of another type is corruption rather than an unknown member, and is left in
 * place for the field's own validator to reject. Sanitization checks (isCssSafeValue) and
 * numeric range checks are deliberately NOT here — an unsafe or out-of-range value
 * stays a hard error.
 */
const pureEnumFields: ReadonlyMap<string, (value: unknown) => boolean> =
	new Map<string, (value: unknown) => boolean>([
		["startArrow", isArrowType],
		["endArrow", isArrowType],
		["strokeDashType", isStrokeDashType],
		["textAlign", isTextAlign],
		["textLayout", isTextLayout],
		["textVerticalBasis", isTextVerticalBasis],
		["verticalAlign", isVerticalAlign],
		["routing", isConnectorRouting],
	]);

/**
 * Keys the strip never enters: `children` is walked by the tree walk, and `meta` is
 * the host's own record (see `MetaDoc`), whose values may share a
 * name with an enum field without being one.
 */
const passthroughKeys: ReadonlySet<string> = new Set(["children", "meta"]);

/** Shared so a node with nothing to strip is answered without an allocation. */
const noWarnings: readonly SemanticDiagnostic[] = [];

export type StripUnknownEnumValuesResult = {
	/** The node with unknown enum values removed (the input itself when nothing was removed). */
	node: ObjectTreeNode;
	/** One diagnostic per dropped field, in the order the walk met them. */
	warnings: readonly SemanticDiagnostic[];
};

/**
 * Allocation-free detection of an unknown pure-enum value anywhere in the subtree
 * (`children` and `meta` excluded, see {@link passthroughKeys}). Parsing runs per
 * text edit in the VSCode host, so the common all-valid document must not pay the
 * copying walk below; this scan is what lets it exit with reads only.
 */
const containsUnknownEnumValue = (value: unknown): boolean => {
	if (isArray(value)) {
		return value.some(containsUnknownEnumValue);
	}
	if (!isObject(value)) {
		return false;
	}
	for (const key in value) {
		if (passthroughKeys.has(key)) {
			continue;
		}
		const isKnownEnumValue = pureEnumFields.get(key);
		const propValue = value[key];
		if (
			isKnownEnumValue !== undefined &&
			isString(propValue) &&
			!isKnownEnumValue(propValue)
		) {
			return true;
		}
		if (containsUnknownEnumValue(propValue)) {
			return true;
		}
	}
	return false;
};

/** Any value below a node: an array, a nested object, or a leaf that is left alone. */
const stripEnumValue = (
	value: unknown,
	path: string,
	ownerId: string | undefined,
): { value: unknown; warnings: readonly SemanticDiagnostic[] } => {
	if (!containsUnknownEnumValue(value)) {
		return { value, warnings: noWarnings };
	}
	if (isArray(value)) {
		const warnings: SemanticDiagnostic[] = [];
		let changed = false;
		const strippedElements = value.map((element, index) => {
			const strippedElement = stripEnumValue(
				element,
				`${path}[${index}]`,
				ownerId,
			);
			warnings.push(...strippedElement.warnings);
			changed = changed || strippedElement.value !== element;
			return strippedElement.value;
		});
		return { value: changed ? strippedElements : value, warnings };
	}
	if (!isObject(value)) {
		return { value, warnings: noWarnings };
	}
	const strippedRecord = stripRecordEnumFields(value, path, ownerId);
	return { value: strippedRecord.node, warnings: strippedRecord.warnings };
};

/** The entries of one record, {@link passthroughKeys} copied as they are. */
const stripRecordEnumFields = (
	record: ObjectTreeNode,
	path: string,
	ownerId: string | undefined,
): StripUnknownEnumValuesResult => {
	const warnings: SemanticDiagnostic[] = [];
	let changed = false;
	const stripped: Record<string, unknown> = {};
	Object.entries(record).forEach(([key, propValue]) => {
		if (passthroughKeys.has(key)) {
			stripped[key] = propValue;
			return;
		}
		const isKnownEnumValue = pureEnumFields.get(key);
		if (
			isKnownEnumValue !== undefined &&
			isString(propValue) &&
			!isKnownEnumValue(propValue)
		) {
			warnings.push({
				path: `${path}.${key}`,
				message: `Unknown ${key} value "${propValue}": the field was ignored and will be dropped on save.`,
				severity: "warning",
				...(ownerId !== undefined ? { id: ownerId } : {}),
			});
			changed = true;
			return;
		}
		const strippedProp = stripEnumValue(propValue, `${path}.${key}`, ownerId);
		warnings.push(...strippedProp.warnings);
		changed = changed || strippedProp.value !== propValue;
		stripped[key] = strippedProp.value;
	});
	return { node: changed ? stripped : record, warnings };
};

/**
 * Removes unknown pure-enum values at any depth of one object node (flat fields, the
 * connector label, text slots, …). Structural recursion into group children is owned
 * by the tree walk, so `children` is passed through untouched, and so is the
 * host-owned `meta`.
 *
 * @param node - The object node to strip; its `children` are not read
 * @param path - Diagnostic path of the node, which each stripped field is appended to
 * @param ownerId - Id put on every warning so an editor can point at the object;
 *   undefined for a node without one
 * @returns The stripped node — the input itself when nothing was removed, subtrees
 *   copied only along paths where something was dropped — and one warning per field
 */
export const stripUnknownEnumValues = (
	node: ObjectTreeNode,
	path: string,
	ownerId: string | undefined,
): StripUnknownEnumValuesResult => {
	if (!containsUnknownEnumValue(node)) {
		return { node, warnings: noWarnings };
	}
	return stripRecordEnumFields(node, path, ownerId);
};
