import { isObject, isString } from "@jiscribe/basic-validators";

import { isViewOpenMode, isViewScrollMode } from "../../model/canvas/ViewDoc";
import type { SemanticDiagnostic } from "../../model/types/SemanticDiagnostic";

/** The pure-enum fields of the document-root `view`, keyed by field name. */
const viewEnumFields: ReadonlyMap<string, (value: unknown) => boolean> =
	new Map<string, (value: unknown) => boolean>([
		["open", isViewOpenMode],
		["scroll", isViewScrollMode],
	]);

export type StripUnknownViewFieldsResult = {
	/** The `view` with unknown modes removed (the input itself when nothing was removed). */
	view: unknown;
	/** One diagnostic per dropped field, in the order the fields are listed above. */
	warnings: readonly SemanticDiagnostic[];
};

/**
 * Drops a `view` field holding a string outside its known set, so an older host
 * still opens a document written for a newer one. A value of another type stays in
 * place for `validateViewDoc` to reject, the same way the object-level enum strip
 * leaves one. `view` is a document-root field rather than something inside an
 * object, so it cannot go through that strip, which walks the entries of `root` only.
 *
 * @param view - The document-root `view` value; anything without an object shape
 *   comes back untouched and without a warning
 * @returns The stripped `view` — the input itself when nothing was removed, so
 *   callers can detect the no-change case by reference — and one warning per field
 */
export const stripUnknownViewFields = (
	view: unknown,
): StripUnknownViewFieldsResult => {
	if (!isObject(view)) {
		return { view, warnings: [] };
	}
	const warnings: SemanticDiagnostic[] = [];
	let stripped: Record<string, unknown> | undefined;
	viewEnumFields.forEach((isKnownValue, field) => {
		const value = view[field];
		if (!isString(value) || isKnownValue(value)) {
			return;
		}
		warnings.push({
			path: `view.${field}`,
			message: `Unknown ${field} value "${value}": the field was ignored and will be dropped on save.`,
			severity: "warning",
		});
		stripped = stripped ?? { ...view };
		delete stripped[field];
	});
	return { view: stripped ?? view, warnings };
};
