import { isObject, isString } from "@workspace/basic-validators";
import type { SemanticDiagnostic } from "@workspace/canvas/doc";
import { TEXT_SLOT_STYLE_KEYS } from "@workspace/canvas/doc";
import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import {
	createFrameDocValidator,
	validateTextSlotStyleFields,
} from "@workspace/canvas/unstable-doc";

import {
	RECORD_NAME_SLOT_ID,
	RECORD_ROWS_SLOT_ID,
	RecordFeatures,
} from "./RecordDoc";

/** The only slot ids a record has; anything else in `text` is a typo, not a new slot. */
const RECORD_SLOT_IDS: string[] = [RECORD_NAME_SLOT_ID, RECORD_ROWS_SLOT_ID];

/** Validates one slot: its content in the shape that slot fixes, plus its own styling. */
const validateSlot = (
	value: unknown,
	path: string,
	validateContent: (
		content: unknown,
		contentPath: string,
	) => SemanticDiagnostic[],
): SemanticDiagnostic[] => {
	if (!isObject(value)) {
		return [
			{
				path,
				message:
					'must be an object with a "text" field (a slot carries its own styling)',
			},
		];
	}
	return [
		...validateContent(value.text, `${path}.text`),
		...validateTextSlotStyleFields(value, path),
	];
};

/** Validates the title's content: one string, newlines and all. */
const validateName = (content: unknown, path: string): SemanticDiagnostic[] =>
	isString(content) ? [] : [{ path, message: "must be a string" }];

/** Validates the rows: every entry is one row, so an embedded newline would silently split it. */
const validateRows = (content: unknown, path: string): SemanticDiagnostic[] => {
	if (!Array.isArray(content)) {
		return [{ path, message: "must be an array of strings" }];
	}
	return content.flatMap((row, index) => {
		if (!isString(row)) {
			return [{ path: `${path}[${index}]`, message: "must be a string" }];
		}
		if (row.includes("\n")) {
			return [
				{
					path: `${path}[${index}]`,
					message: "must not contain a newline: use one array entry per row",
					// The JSON schema cannot express this rule, so the VSCode
					// extension shows it only when the validator flags it itself.
					beyondSchema: true,
				},
			];
		}
		return [];
	});
};

/**
 * Validates the record's `text`, which is a closed set of keyed slots rather than
 * the single string most text-bearing shapes take. An absent `text` or an absent
 * slot is allowed and reads as empty (RecordMapper); a string, a mistyped slot,
 * and an unknown key are reported so a document never renders with text the
 * record silently dropped.
 */
const validateRecordText: ObjectDocValidateFn = (o, path) => {
	if (!("text" in o) || o.text === undefined) {
		return [];
	}
	const text = o.text;
	const textPath = `${path}.text`;
	if (!isObject(text)) {
		return [
			{
				path: textPath,
				message: `must be an object with the "${RECORD_NAME_SLOT_ID}" and "${RECORD_ROWS_SLOT_ID}" slots (a record does not take a plain string)`,
			},
		];
	}

	const unknownKeys = Object.keys(text).filter(
		(key) => !RECORD_SLOT_IDS.includes(key),
	);
	return [
		...unknownKeys.map((key) => ({
			path: `${textPath}.${key}`,
			message: `is not a slot of a record: use "${RECORD_NAME_SLOT_ID}" or "${RECORD_ROWS_SLOT_ID}"`,
		})),
		...(RECORD_NAME_SLOT_ID in text
			? validateSlot(
					text[RECORD_NAME_SLOT_ID],
					`${textPath}.${RECORD_NAME_SLOT_ID}`,
					validateName,
				)
			: []),
		...(RECORD_ROWS_SLOT_ID in text
			? validateSlot(
					text[RECORD_ROWS_SLOT_ID],
					`${textPath}.${RECORD_ROWS_SLOT_ID}`,
					validateRows,
				)
			: []),
	];
};

/**
 * Reports text styling written at the root. A record styles each slot on its own,
 * so a shape-wide value would be silently dropped by the mapper — the shapes that
 * do take one are the ones whose text is a single body.
 */
const validateNoRootTextStyle: ObjectDocValidateFn = (o, path) =>
	TEXT_SLOT_STYLE_KEYS.filter((key) => key in o).map((key) => ({
		path: `${path}.${key}`,
		message: `is not a field of a record: set it on "text.${RECORD_NAME_SLOT_ID}" / "text.${RECORD_ROWS_SLOT_ID}" instead`,
	}));

/** Validates a RecordDoc (Frame-family shared logic + the closed keyed `text`). */
export const validateRecordDoc: ObjectDocValidateFn = createFrameDocValidator(
	RecordFeatures,
	(o, path) => [
		...validateRecordText(o, path),
		...validateNoRootTextStyle(o, path),
	],
);
