import { isArray, isNumber, isObject } from "@jiscribe/basic-validators";
import type { ObjectDocValidateFn } from "@jiscribe/canvas-sdk/doc";
import {
	validateRichTextContent,
	validateTextSlotStyleFields,
} from "@jiscribe/canvas-sdk/doc";
import type { SemanticDiagnostic } from "@jiscribe/doc";
import { TEXT_SLOT_STYLE_KEYS } from "@jiscribe/doc";

import {
	ER_ENTITY_COLUMN_FIELDS,
	ER_ENTITY_MIN_SLOT_WIDTHS,
	ER_ENTITY_SLOT_WIDTH_KEYS,
} from "./ErEntityDoc";

/** The column fields spelled out for a diagnostic: `"key" / "name" / "type"`. */
const COLUMN_FIELD_LIST = ER_ENTITY_COLUMN_FIELDS.map(
	(field) => `"${field}"`,
).join(" / ");

/**
 * Validates one text, in either of the two forms a document may write: the text
 * alone, or the slot object carrying its own typography.
 */
const validateText = (value: unknown, path: string): SemanticDiagnostic[] => {
	if (!isObject(value)) {
		return validateRichTextContent(value, path);
	}
	return [
		...validateRichTextContent(value.text, `${path}.text`),
		...validateTextSlotStyleFields(value, path),
	];
};

/**
 * Validates one stated slot width: absent, or a number of at least `minimum`.
 * The floor that follows the measured texts is not checked: a validator does not
 * measure, and the shape widens such a slot on its own.
 */
const validateSlotWidth = (
	value: unknown,
	path: string,
	minimum: number,
): SemanticDiagnostic[] => {
	if (value === undefined) {
		return [];
	}
	if (!isNumber(value)) {
		return [{ path, message: "must be a number", severity: "error" }];
	}
	if (value < minimum) {
		return [{ path, message: `must be >= ${minimum}`, severity: "error" }];
	}
	return [];
};

/**
 * Validates one column: an object of the three texts, the name required, each
 * in either form ({@link validateText}). An unknown field is reported rather than ignored, the parser's own check stopping
 * at the object's top level: a typo (`"types"`) would otherwise lose the text on
 * the next save.
 */
const validateColumn = (value: unknown, path: string): SemanticDiagnostic[] => {
	if (!isObject(value)) {
		return [
			{
				path,
				message: `must be an object with ${COLUMN_FIELD_LIST}`,
				severity: "error",
			},
		];
	}
	const unknownFields = Object.keys(value).filter(
		(field) => !(ER_ENTITY_COLUMN_FIELDS as readonly string[]).includes(field),
	);
	return [
		...unknownFields.map((field) => ({
			path: `${path}.${field}`,
			message: `is not a field of a column: use ${COLUMN_FIELD_LIST}`,
			severity: "error" as const,
		})),
		...(value.name === undefined
			? [
					{
						path: `${path}.name`,
						message: "is required",
						severity: "error" as const,
					},
				]
			: validateText(value.name, `${path}.name`)),
		...(value.key === undefined ? [] : validateText(value.key, `${path}.key`)),
		...(value.type === undefined
			? []
			: validateText(value.type, `${path}.type`)),
	];
};

/** Validates the column list; an empty one is an entity with no columns yet, which is allowed. */
const validateColumns = (
	value: unknown,
	path: string,
): SemanticDiagnostic[] => {
	if (!isArray(value)) {
		return [
			{ path, message: "must be an array of columns", severity: "error" },
		];
	}
	return value.flatMap((column, index) =>
		validateColumn(column, `${path}[${index}]`),
	);
};

/**
 * Reports text styling written at the root. An entity styles each text on its
 * own, so a shape-wide value would be silently dropped by the mapper on the
 * next save (the table's counterpart, validateNoRootTextStyle).
 */
const validateNoRootTextStyle: ObjectDocValidateFn = (o, path) =>
	TEXT_SLOT_STYLE_KEYS.filter((key) => key in o).map((key) => ({
		path: `${path}.${key}`,
		message: `is not a field of an entity: write it on the text it styles instead, as { "text": …, "${key}": … }`,
		severity: "error" as const,
	}));

/**
 * Validates what an entity declares on top of the point-geometry family: the
 * three slot widths, the title, the columns, and the absence of root text
 * styling. A `text` is refused outright — the type's text feature is what makes
 * the parser accept the name, but the entity writes its texts as `name` and
 * `columns`.
 *
 * Passed as the `extra` of `createFrameDocValidator(ErEntityFeatures, …)`, which
 * checks the position, the transform, the stroke and the fill.
 *
 * @param o - The object being validated, straight from the document
 * @param path - Diagnostic path of `o` (`root[2]`), which every field name and column index is appended to
 * @returns One diagnostic per malformed field; empty for a valid entity
 */
export const validateErEntityFields: ObjectDocValidateFn = (o, path) => [
	...ER_ENTITY_SLOT_WIDTH_KEYS.flatMap((field) =>
		validateSlotWidth(
			o[field],
			`${path}.${field}`,
			ER_ENTITY_MIN_SLOT_WIDTHS[field],
		),
	),
	...validateText(o.name, `${path}.name`),
	...validateColumns(o.columns, `${path}.columns`),
	...validateNoRootTextStyle(o, path),
	...("text" in o
		? [
				{
					path: `${path}.text`,
					message:
						'is not a field of an entity: write the title as "name" and the columns as "columns"',
					severity: "error" as const,
				},
			]
		: []),
];
