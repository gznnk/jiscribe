import { isObject, isString } from "@jiscribe/basic-validators";

import type { DocFieldValidator } from "./fieldValidators";
import {
	colorValidator,
	cssValueValidator,
	enumValidator,
	numberValidator,
	validateFields,
} from "./fieldValidators";
import type { SemanticDiagnostic } from "../../types/SemanticDiagnostic";
import type { InlineTextStyle } from "../types/text/InlineTextStyle";
import { isTextAlign } from "../types/text/TextAlign";
import type { TextBaseStyle } from "../types/text/TextBaseStyle";
import { FONT_SIZE_MIN } from "../types/text/TextBaseStyle";
import type { TextEmphasisStyle } from "../types/text/TextEmphasisStyle";
import type { TextSlotStyle } from "../types/text/TextSlot";
import { isTextVerticalBasis } from "../types/text/TextVerticalBasis";
import { isVerticalAlign } from "../types/text/VerticalAlign";

/** The ground typography, in the order of `TEXT_BASE_STYLE_KEYS`. */
const textBaseStyleValidators = {
	fontColor: colorValidator,
	fontSize: numberValidator(FONT_SIZE_MIN),
	fontFamily: cssValueValidator("font-family"),
} as const satisfies Record<keyof TextBaseStyle, DocFieldValidator>;

/** The emphasis typography, in the order of `TEXT_EMPHASIS_STYLE_KEYS`. */
const textEmphasisStyleValidators = {
	fontWeight: cssValueValidator("font-weight"),
	fontStyle: cssValueValidator("font-style"),
	textDecoration: cssValueValidator("text-decoration"),
} as const satisfies Record<keyof TextEmphasisStyle, DocFieldValidator>;

/**
 * The inline typography, in the order of `TEXT_INLINE_STYLE_KEYS`. Applied to a
 * slot and to every run of its text alike, a run being inlined into the same CSS.
 */
const inlineTextStyleValidators = {
	...textBaseStyleValidators,
	...textEmphasisStyleValidators,
} as const satisfies Record<keyof InlineTextStyle, DocFieldValidator>;

/** The alignment fields, which place the whole block and so have no per-run counterpart. */
const textBlockStyleValidators = {
	textAlign: enumValidator(isTextAlign, "must be one of: left, center, right"),
	verticalAlign: enumValidator(
		isVerticalAlign,
		"must be one of: top, middle, bottom",
	),
} as const satisfies Record<
	Exclude<keyof TextSlotStyle, keyof InlineTextStyle>,
	DocFieldValidator
>;

/**
 * A slot's whole styling: the alignment that places the block before the inline
 * half, so the iteration order matches `TEXT_SLOT_STYLE_KEYS` and, with it, the
 * order the diagnostics come out in.
 */
const textSlotStyleValidators = {
	...textBlockStyleValidators,
	...inlineTextStyleValidators,
} as const satisfies Record<keyof TextSlotStyle, DocFieldValidator>;

/**
 * The styling a source-language body accepts: the slot's set less the emphasis
 * half the syntax carries itself (`textStyleKeysOf`), in the same order.
 */
const sourceTextStyleValidators = {
	...textBlockStyleValidators,
	...textBaseStyleValidators,
} as const satisfies Record<
	Exclude<keyof TextSlotStyle, keyof TextEmphasisStyle>,
	DocFieldValidator
>;

/**
 * Validate the styling fields a text carries — `textAlign`, `verticalAlign`,
 * `fontColor` (safe CSS color), `fontSize` (≥ 1), and
 * `fontFamily`/`fontWeight`/`fontStyle`/`textDecoration` (safe CSS values). The
 * same names appear flat on a single-body doc and inside each slot of a keyed
 * one, so both forms validate them through here.
 *
 * @param o - The object carrying the styling: the doc itself, or one of its text slots
 * @param path - Diagnostic path of `o`, which each field name is appended to
 * @returns One diagnostic per malformed field; empty when every field is absent or valid
 */
export function validateTextSlotStyleFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	return validateFields(o, path, textSlotStyleValidators);
}

/**
 * Validate the styling fields that a stretch of characters can carry on its own —
 * everything a slot's typography has except the alignment, which places the whole
 * block. Both a slot and one of its runs (RichText) validate them through here.
 *
 * @param o - The object carrying the styling: a text slot, a single-body doc, or one run
 * @param path - Diagnostic path of `o`, which each field name is appended to
 * @returns One diagnostic per malformed field; empty when every field is absent or valid
 */
export function validateInlineTextStyleFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	return validateFields(o, path, inlineTextStyleValidators);
}

/**
 * Validate one body of text (RichText): the plain string it usually is, or the
 * runs it is written as when parts of it are styled on their own. A run's own
 * styling is validated like a slot's, minus the alignment it cannot carry.
 *
 * @param content - The value written as the text; anything but a string or an array is rejected
 * @param path - Diagnostic path of the text field, which the run index is appended to
 * @returns One diagnostic per malformed run or field; empty when the text is valid
 */
export function validateRichTextContent(
	content: unknown,
	path: string,
): SemanticDiagnostic[] {
	if (isString(content)) {
		return [];
	}
	if (!Array.isArray(content)) {
		return [
			{
				path,
				message: "must be a string, or an array of runs to style parts of it",
				severity: "error",
			},
		];
	}
	return content.flatMap((run, index) => {
		const runPath = `${path}[${index}]`;
		if (!isObject(run)) {
			return [
				{
					path: runPath,
					message: "must be an object with a text field",
					severity: "error",
				},
			];
		}
		return [
			...(isString(run.text)
				? []
				: [
						{
							path: `${runPath}.text`,
							message: "must be a string",
							severity: "error" as const,
						},
					]),
			...validateInlineTextStyleFields(run, runPath),
		];
	});
}

/**
 * Validate the placement a single-body doc carries on the object itself
 * (`TEXT_BODY_KEYS`), which both root-form text types hold alike.
 */
function validateTextBodyFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	if (!("textVerticalBasis" in o) || isTextVerticalBasis(o.textVerticalBasis)) {
		return [];
	}
	return [
		{
			path: `${path}.textVerticalBasis`,
			message: "must be one of: region, frame",
			severity: "error",
		},
	];
}

/**
 * Validate the text group of a single-body doc (features.text: "body"): `text`
 * as one body of text plus the flat styling fields. A keyed object is rejected
 * here — a type whose text is keyed declares `text: "slots"` and validates its
 * own closed slot set (see the record shape).
 *
 * @param o - The doc to check; a missing `text` is valid (it reads as empty)
 * @param path - Diagnostic path of `o`, which each field name is appended to
 * @returns One diagnostic per malformed field; empty when the whole group is valid
 */
export function validateTextStyleFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	return [
		...("text" in o ? validateRichTextContent(o.text, `${path}.text`) : []),
		...validateTextBodyFields(o, path),
		...validateTextSlotStyleFields(o, path),
	];
}

/**
 * What a source body that is not a string is told. It says what to write instead,
 * since the usual cause is a run list an editor once left behind, and a document
 * holding one does not open until it is rewritten by hand.
 */
const SOURCE_TEXT_MESSAGE =
	"must be a plain string: a source text takes no styled runs, so write the emphasis in the source itself";

/**
 * Validate the text group of a source-language doc (features.text: "source"):
 * the same group {@link validateTextStyleFields} checks, narrowed to what that
 * shape can hold — `text` as a plain string, and the styling less the emphasis
 * half (`textStyleKeysOf`). An emphasis field written anyway goes unreported
 * here, as every other field the type's features do not imply does.
 *
 * @param o - The doc to check; a missing `text` is valid (it reads as empty)
 * @param path - Diagnostic path of `o`, which each field name is appended to
 * @returns One diagnostic per malformed field; empty when the whole group is valid
 */
export function validateSourceTextStyleFields(
	o: Record<string, unknown>,
	path: string,
): SemanticDiagnostic[] {
	return [
		...("text" in o && !isString(o.text)
			? [
					{
						path: `${path}.text`,
						message: SOURCE_TEXT_MESSAGE,
						severity: "error" as const,
					},
				]
			: []),
		...validateTextBodyFields(o, path),
		...validateFields(o, path, sourceTextStyleValidators),
	];
}
