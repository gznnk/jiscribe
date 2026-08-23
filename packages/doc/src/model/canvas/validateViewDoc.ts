import { isObject } from "@jiscribe/basic-validators";

import { isViewOpenMode } from "./ViewDoc";
import { validateOptionalNumber } from "../objects/utils/validateDocUtils";
import type { SemanticDiagnostic } from "../types/SemanticDiagnostic";

/** The four sides of `view.padding`, checked one by one so each names its own path. */
const PADDING_SIDES = ["top", "right", "bottom", "left"] as const;

/**
 * Validates the optional `view` field of a CanvasDoc: the padding sides and the
 * open mode.
 *
 * Padding is rejected below 0 — it is empty space kept *outside* the content, so
 * a negative side would crop the drawing rather than frame it, which no caller
 * of `view` treats as meaningful.
 *
 * An `open` value outside the known set is not an error here in the parse
 * pipeline: `stripUnknownContent` drops it with a warning first, the same way an
 * unknown `textAlign` is dropped. This check is what catches it for a direct
 * caller that skipped the strip.
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
		return [{ path, message: "must be an object" }];
	}

	const v = view as Record<string, unknown>;
	const errors: SemanticDiagnostic[] = [];

	if (v.padding !== undefined) {
		if (!isObject(v.padding)) {
			errors.push({ path: `${path}.padding`, message: "must be an object" });
		} else {
			const padding = v.padding as Record<string, unknown>;
			PADDING_SIDES.forEach((side) => {
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
		});
	}

	return errors;
}
