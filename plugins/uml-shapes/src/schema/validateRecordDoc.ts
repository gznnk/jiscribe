import { isObject, isString } from "@workspace/basic-validators";
import type { SemanticDiagnostic } from "@workspace/canvas/doc";
import { TEXT_SLOT_STYLE_KEYS } from "@workspace/canvas/doc";
import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import {
	createFrameDocValidator,
	validateTextSlotStyleFields,
} from "@workspace/canvas-sdk/doc";

import {
	RECORD_NAME_SLOT_ID,
	RECORD_SLOT_IDS,
	RecordFeatures,
} from "./RecordDoc";

/** The slot ids spelled out for a diagnostic, e.g. `"name" / "attributes" / "operations"`. */
const RECORD_SLOT_ID_LIST = RECORD_SLOT_IDS.map((id) => `"${id}"`).join(" / ");

/** Validates the title's content: one string, newlines and all. */
const validateName = (content: unknown, path: string): SemanticDiagnostic[] =>
	isString(content) ? [] : [{ path, message: "must be a string" }];

/** Validates a compartment's rows: every entry is one row, so an embedded newline would silently split it. */
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
 * The content each slot fixes. The title is one string; every other slot is a
 * compartment of rows, so they share one check — the difference between them is
 * what they mean, not what they hold.
 */
const validateSlotContent: Record<
	string,
	(content: unknown, path: string) => SemanticDiagnostic[]
> = Object.fromEntries(
	RECORD_SLOT_IDS.map((slotId) => [
		slotId,
		slotId === RECORD_NAME_SLOT_ID ? validateName : validateRows,
	]),
);

/** Validates one slot: its content in the shape that slot fixes, plus its own styling. */
const validateSlot = (
	value: unknown,
	slotId: string,
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
	return [
		...validateSlotContent[slotId](value.text, `${path}.text`),
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

	const unknownKeys = Object.keys(text).filter(
		(key) => !(RECORD_SLOT_IDS as readonly string[]).includes(key),
	);
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

/** Validates a RecordDoc (Frame-family shared logic + the closed keyed `text`). */
export const validateRecordDoc: ObjectDocValidateFn = createFrameDocValidator(
	RecordFeatures,
	(o, path) => [
		...validateRecordText(o, path),
		...validateNoRootTextStyle(o, path),
	],
);
