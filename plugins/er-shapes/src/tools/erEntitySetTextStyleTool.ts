import {
	canonicalizeFontWeight,
	defineObjectAiTool,
	textSlotStyleSchema,
} from "@jiscribe/canvas-sdk/tools";
import { isRichText } from "@jiscribe/doc";
import type { TextSlotStyle } from "@jiscribe/doc";
import { z } from "zod";

import {
	createErEntityColumnCountSchema,
	erEntityColumnSchema,
} from "./erEntityToolSchemas";
import {
	ER_ENTITY_ADDRESSING_NOTE,
	ER_ENTITY_GENERIC_TOOLS_NOTE,
	formatErEntityColumnSpan,
	formatErEntityColumnSummary,
} from "./erEntityToolText";
import { requireErEntityColumnRange } from "./writeErEntityDocColumns";
import { ER_ENTITY_COLUMN_FIELDS } from "../schema/ErEntityDoc";
import type {
	ErEntityColumnDoc,
	ErEntityColumnField,
	ErEntityDoc,
	ErEntityTextDoc,
} from "../schema/ErEntityDoc";

/** The style arguments, named in the refusal of a call that gives none. */
const ER_ENTITY_STYLE_ARG_NAMES = Object.keys(textSlotStyleSchema);

/** A text with the style laid onto it: a plain text becomes a slot, a slot keeps what the style does not give. */
const styleText = (
	text: ErEntityTextDoc,
	style: TextSlotStyle,
): ErEntityTextDoc =>
	isRichText(text) ? { text, ...style } : { ...text, ...style };

/** er_entity_set_text_style: typography laid onto the title and / or the texts of a run of columns. */
export const erEntitySetTextStyleTool = defineObjectAiTool({
	name: "er_entity_set_text_style",
	description: [
		"Style texts of an ER entity: the title, and / or the key, name and type texts of a run of columns. Each text gets the typography given and keeps what is not given; a larger fontSize makes its row (or the title band) taller on its own.",
		`${ER_ENTITY_GENERIC_TOOLS_NOTE} An entity has no shape-wide font settings: set_style reaches only its fill and outline, while every text carries its own typography.`,
		"A column with no key or no type is left without one; write it first with er_entity_set_texts.",
		ER_ENTITY_ADDRESSING_NOTE,
	].join(" "),
	objectType: "erEntity",
	inputSchema: {
		title: z.boolean().optional().describe("true styles the entity's title."),
		column: erEntityColumnSchema
			.optional()
			.describe(
				"First column whose texts are styled, 0-based from the top; omit to style no column.",
			),
		count: createErEntityColumnCountSchema("style"),
		fields: z
			.array(z.enum(ER_ENTITY_COLUMN_FIELDS))
			.min(1)
			.optional()
			.describe(
				'Which texts of each column to style; omit for all three ("key", "name", "type"). Only with column.',
			),
		...textSlotStyleSchema,
	},
	apply: (entity: ErEntityDoc, { title, column, count, fields, ...style }) => {
		const textStyle: TextSlotStyle = Object.fromEntries(
			Object.entries(style).filter(([, value]) => value !== undefined),
		);
		const styledFields = Object.keys(textStyle);
		if (styledFields.length === 0) {
			throw new Error(
				`no style given: pass at least one of ${ER_ENTITY_STYLE_ARG_NAMES.join(", ")}`,
			);
		}
		if (textStyle.fontWeight !== undefined) {
			textStyle.fontWeight = canonicalizeFontWeight(textStyle.fontWeight);
		}
		if (title !== true && column === undefined) {
			throw new Error(
				"no text named: pass title: true for the title, and / or column (with count and fields) for column texts",
			);
		}
		if (column === undefined && (count !== undefined || fields !== undefined)) {
			throw new Error(
				"count and fields pick texts of columns: pass column with them",
			);
		}

		const styledColumnFields: readonly ErEntityColumnField[] =
			fields ?? ER_ENTITY_COLUMN_FIELDS;
		const styledCount = count ?? 1;
		const columns: ErEntityColumnDoc[] = [...entity.columns];
		if (column !== undefined) {
			requireErEntityColumnRange(entity, column, styledCount);
			for (
				let columnIndex = column;
				columnIndex < column + styledCount;
				columnIndex++
			) {
				const styledColumn = { ...columns[columnIndex] };
				for (const field of styledColumnFields) {
					const text = styledColumn[field];
					if (text !== undefined) {
						styledColumn[field] = styleText(text, textStyle);
					}
				}
				columns[columnIndex] = styledColumn;
			}
		}
		const nextEntity: ErEntityDoc = {
			...entity,
			name: title === true ? styleText(entity.name, textStyle) : entity.name,
			columns,
		};
		// Refused rather than written back unchanged, which would leave an undo step
		// that takes back nothing
		if (
			JSON.stringify([nextEntity.name, nextEntity.columns]) ===
			JSON.stringify([entity.name, entity.columns])
		) {
			throw new Error(
				`the texts named on erEntity "${entity.id}" already have that style, or there are none (a column without a key or type has no such text); nothing was changed`,
			);
		}

		const targetParts = [
			...(title === true ? ["the title"] : []),
			...(column === undefined
				? []
				: [
						`${styledColumnFields.join(" / ")} of ${formatErEntityColumnSpan(column, styledCount)}`,
					]),
		];
		return {
			doc: nextEntity,
			text: `set ${styledFields.join(", ")} on ${targetParts.join(" and ")} of erEntity "${entity.id}"; it has ${formatErEntityColumnSummary(columns)}`,
		};
	},
});
