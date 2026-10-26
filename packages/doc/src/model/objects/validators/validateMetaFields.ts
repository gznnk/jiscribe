import { isObject, isString } from "@jiscribe/basic-validators";

import type { SemanticDiagnostic } from "../../types/SemanticDiagnostic";
import { META_DOC_STRING_KEYS } from "../base/MetaDoc";

/**
 * Validate an optional `meta` — the one every object may carry, and the
 * document's own: an object whose named members (`META_DOC_STRING_KEYS`), when
 * present, are strings. The record is open past those, so no other member is
 * looked at.
 *
 * @param meta - The `meta` value as read; undefined (absent) is valid
 * @param metaPath - Diagnostic path of `meta` itself (`root[0].meta`, or `meta` for the document's), which the member name is appended to
 * @returns One diagnostic per malformed value; empty when `meta` is absent or well-formed
 */
export function validateMetaFields(
	meta: unknown,
	metaPath: string,
): SemanticDiagnostic[] {
	if (meta === undefined) {
		return [];
	}
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
