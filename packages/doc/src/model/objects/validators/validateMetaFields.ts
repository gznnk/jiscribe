import { isObject, isString } from "@jiscribe/basic-validators";

import type { SemanticDiagnostic } from "../../types/SemanticDiagnostic";
import { META_DOC_STRING_KEYS } from "../base/MetaDoc";

/**
 * Validate the optional `meta` every object may carry: an object whose named
 * members (`META_DOC_STRING_KEYS`), when present, are strings. The record is open
 * past those, so no other member is looked at.
 *
 * @param o - The object doc; a missing `meta` is valid
 * @param path - Diagnostic path of `o`, which `.meta` and the member name are appended to
 * @returns One diagnostic per malformed value; empty when `meta` is absent or well-formed
 */
export function validateMetaFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	const meta = o.meta;
	if (meta === undefined) {
		return [];
	}
	const metaPath = `${path}.meta`;
	if (!isObject(meta)) {
		return [
			{ path: metaPath, message: "must be an object", severity: "error" },
		];
	}
	return META_DOC_STRING_KEYS.filter(
		(key) => meta[key] !== undefined && !isString(meta[key]),
	).map((key) => ({
		path: `${metaPath}.${key}`,
		message: "must be a string",
		severity: "error" as const,
	}));
}
