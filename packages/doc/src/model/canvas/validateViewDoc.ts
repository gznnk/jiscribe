import { isObject } from "@jiscribe/basic-validators";

import { isViewOpenMode, isViewScrollMode, VIEW_PADDING_KEYS } from "./ViewDoc";
import { validateOptionalNumber } from "../objects/validators/validateNumberFields";
import type { SemanticDiagnostic } from "../types/SemanticDiagnostic";

/**
 * Validates the optional `view` field of a CanvasDoc: the padding sides, the
 * open mode and the scroll mode.
 *
 * Padding is rejected below 0 — it is empty space kept *outside* the content, so
 * a negative side would crop the drawing rather than frame it, which no caller
 * of `view` treats as meaningful.
 *
 * An `open` or `scroll` holding a *string* outside the known set does not reach
 * here in the parse pipeline: `stripUnknownContent` drops it with a warning first,
 * the same way an unknown `textAlign` is dropped. A value of any other type is not
 * stripped, so this is what rejects it — as it is what catches an unknown mode for
 * a direct caller that skipped the strip.
 *
 * @param view - The candidate `view` value, unvalidated; anything that is not an
 *   object yields a single diagnostic at `path`
 * @param path - Diagnostic path prefix of the field being checked (`"view"` from
 *   the document root)
 * @returns A list of diagnostics; empty when the value is a usable `ViewDoc`.
 */
export function validateViewDoc(
	view: unknown,
	path: string,
): SemanticDiagnostic[] {
	if (!isObject(view)) {
		return [{ path, message: "must be an object", severity: "error" }];
	}

	const v = view as Record<string, unknown>;
	const errors: SemanticDiagnostic[] = [];

	if (v.padding !== undefined) {
		if (!isObject(v.padding)) {
			errors.push({
				path: `${path}.padding`,
				message: "must be an object",
				severity: "error",
			});
		} else {
			const padding = v.padding as Record<string, unknown>;
			VIEW_PADDING_KEYS.forEach((side) => {
				errors.push(
					...validateOptionalNumber(padding, `${path}.padding`, side, 0),
				);
			});
		}
	}

	if (v.open !== undefined && !isViewOpenMode(v.open)) {
		errors.push({
			path: `${path}.open`,
			message: 'must be "fit-width" or "fit-all"',
			severity: "error",
		});
	}

	if (v.scroll !== undefined && !isViewScrollMode(v.scroll)) {
		errors.push({
			path: `${path}.scroll`,
			message: 'must be "content" or "infinite"',
			severity: "error",
		});
	}

	return errors;
}
