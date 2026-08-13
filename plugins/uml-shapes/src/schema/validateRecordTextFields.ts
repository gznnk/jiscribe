import { isObject, isString } from "@jiscribe/basic-validators";
import type { RichText, SemanticDiagnostic } from "@jiscribe/canvas/doc";
import { richTextToPlain, TEXT_SLOT_STYLE_KEYS } from "@jiscribe/canvas/doc";
import type { ObjectDocValidateFn } from "@jiscribe/canvas-sdk/doc";
import {
	validateRichTextContent,
	validateTextSlotStyleFields,
} from "@jiscribe/canvas-sdk/doc";

import {
	isRecordListSlotId,
	isRecordSlotId,
	RECORD_SLOT_IDS,
} from "./RecordDoc";
import type { RecordSlotId } from "./RecordDoc";

/** The slot ids spelled out for a diagnostic: `"stereotype" / "name" / …`, in RECORD_SLOT_IDS order. */
const RECORD_SLOT_ID_LIST = RECORD_SLOT_IDS.map((id) => `"${id}"`).join(" / ");

/** Validates a text band's content: one body of text, newlines and all. */
const validateBandText = (
	content: unknown,
	path: string,
): SemanticDiagnostic[] => {
	// A list of strings is the row-partitioned form, which reads as a malformed
	// list of runs without this — the mistake is writing a compartment's rows into
	// a band, so say that rather than pointing at the first entry.
	if (Array.isArray(content) && content.every(isString)) {
		return [{ path, message: "must be one body of text, not rows" }];
	}
	return validateRichTextContent(content, path);
};

/**
 * Validates a compartment's rows: every entry is one row — a plain string, or the
 * runs it is styled in — so an embedded newline would silently split it.
 */
const validateRows = (content: unknown, path: string): SemanticDiagnostic[] => {
	if (!Array.isArray(content)) {
		return [{ path, message: "must be an array of rows" }];
	}
	return content.flatMap((row, index) => {
		const rowPath = `${path}[${index}]`;
		const errors = validateRichTextContent(row, rowPath);
		if (errors.length > 0) {
			return errors;
		}
		if (richTextToPlain(row as RichText).includes("\n")) {
			return [
				{
					path: rowPath,
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
 * Validates one slot: its content in the shape that slot fixes, plus its own
 * styling. Slots on the same side of the band / compartment split share one
 * content check — the difference between the two compartments, as between the two
 * text bands, is what they mean and not what they hold.
 */
const validateSlot = (
	value: unknown,
	slotId: RecordSlotId,
	path: string,
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
	const validateContent = isRecordListSlotId(slotId)
		? validateRows
		: validateBandText;
	return [
		...validateContent(value.text, `${path}.text`),
		...validateTextSlotStyleFields(value, path),
	];
};

/**
 * Validates the record's `text`, which is a closed set of keyed slots rather than
 * the single string most text-bearing shapes take. Which slots are written is the
 * box's compartment structure, so an unknown key is reported rather than ignored:
 * a typo would otherwise silently cost the document a compartment. An absent
 * `text`, and an absent optional slot, are allowed — the box simply has that
 * compartment left off (RecordMapper 参照).
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
				message: `must be an object holding the ${RECORD_SLOT_ID_LIST} slots (a record does not take a plain string)`,
			},
		];
	}

	const unknownKeys = Object.keys(text).filter((key) => !isRecordSlotId(key));
	return [
		...unknownKeys.map((key) => ({
			path: `${textPath}.${key}`,
			message: `is not a slot of a record: use ${RECORD_SLOT_ID_LIST}`,
		})),
		...RECORD_SLOT_IDS.filter((slotId) => slotId in text).flatMap((slotId) =>
			validateSlot(text[slotId], slotId, `${textPath}.${slotId}`),
		),
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
		message: `is not a field of a record: set it on one of ${RECORD_SLOT_ID_LIST} under "text" instead`,
	}));

/**
 * Validates what the record declares on top of the Frame family: the closed
 * keyed `text`, and the absence of the shape-wide text styling a single-body
 * type would take.
 */
export const validateRecordTextFields: ObjectDocValidateFn = (o, path) => [
	...validateRecordText(o, path),
	...validateNoRootTextStyle(o, path),
];
