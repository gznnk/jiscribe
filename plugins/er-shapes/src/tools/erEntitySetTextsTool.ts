import { defineObjectAiTool } from "@jiscribe/canvas-sdk/tools";
import { isRichText } from "@jiscribe/doc";
import { z } from "zod";

import {
	ER_ENTITY_ADDRESSING_NOTE,
	ER_ENTITY_GENERIC_TOOLS_NOTE,
	formatErEntityColumnSummary,
} from "./erEntityToolText";
import { requireSingleLineText } from "./writeErEntityDocColumns";
import type {
	ErEntityColumnDoc,
	ErEntityDoc,
	ErEntityTextDoc,
} from "../schema/ErEntityDoc";

/** What one key or type argument asks for: omitted keeps, null removes, a string writes. */
type ErEntityOptionalTextArg = string | null | undefined;

/** A text holding new characters in the typography it had: a slot keeps its style fields, anything else becomes the plain string. */
const rewriteText = (
	currentText: ErEntityTextDoc | undefined,
	plainText: string,
): ErEntityTextDoc =>
	currentText === undefined || isRichText(currentText)
		? plainText
		: { ...currentText, text: plainText };

/**
 * A key or type after its argument. An empty unstyled one is left out, as the
 * canvas leaves it out of the document.
 */
const resolveOptionalText = (
	currentText: ErEntityTextDoc | undefined,
	arg: ErEntityOptionalTextArg,
): ErEntityTextDoc | undefined => {
	if (arg === undefined) {
		return currentText;
	}
	if (arg === null) {
		return undefined;
	}
	const nextText = rewriteText(currentText, arg);
	return nextText === "" ? undefined : nextText;
};

/** er_entity_set_texts: the title and the columns' texts rewritten, each keeping its typography. */
export const erEntitySetTextsTool = defineObjectAiTool({
	name: "er_entity_set_texts",
	description: [
		"Rewrite the texts of an ER entity: its title and any column's key, name or type, several columns in one call. Each text keeps its typography and takes the new characters (a text held as styled runs becomes one plain run in the text's typography). The box widens to fit a longer text on its own.",
		ER_ENTITY_GENERIC_TOOLS_NOTE,
		"It does not add, remove or reorder columns: use er_entity_insert_columns / er_entity_delete_columns / er_entity_move_columns.",
		ER_ENTITY_ADDRESSING_NOTE,
	].join(" "),
	objectType: "erEntity",
	inputSchema: {
		name: z
			.string()
			.optional()
			.describe("The entity's title; omit to leave it as it is."),
		columns: z
			.array(
				z
					.object({
						column: z
							.number()
							.int()
							.min(0)
							.describe("The column to rewrite, 0-based from the top."),
						key: z
							.string()
							.nullable()
							.optional()
							.describe(
								'Key gutter text ("PK", "FK", "PK, FK", "UK"); null or "" removes the key, omit to leave it as it is.',
							),
						name: z
							.string()
							.optional()
							.describe("Column name; omit to leave it as it is."),
						type: z
							.string()
							.nullable()
							.optional()
							.describe(
								'Column type ("varchar(80) null"); null or "" removes the type, omit to leave it as it is.',
							),
					})
					.strict(),
			)
			.min(1)
			.optional()
			.describe(
				"The columns to rewrite, each named once; every text is one line, no newline.",
			),
	},
	apply: (entity: ErEntityDoc, { name, columns: columnArgs = [] }) => {
		if (name !== undefined) {
			requireSingleLineText(name, "name");
		}
		const columns: ErEntityColumnDoc[] = [...entity.columns];
		const seenColumns = new Set<number>();
		columnArgs.forEach((columnArg, argIndex) => {
			const { column: columnIndex } = columnArg;
			if (columnIndex >= columns.length) {
				throw new Error(
					`columns[${argIndex}].column ${columnIndex} is past the end: entity "${entity.id}" has ${formatErEntityColumnSummary(entity.columns)}`,
				);
			}
			if (seenColumns.has(columnIndex)) {
				throw new Error(
					`column ${columnIndex} is named twice in columns: give each column once, with every text it changes`,
				);
			}
			seenColumns.add(columnIndex);
			for (const field of ["key", "name", "type"] as const) {
				const text = columnArg[field];
				if (typeof text === "string") {
					requireSingleLineText(text, `columns[${argIndex}].${field}`);
				}
			}
			const currentColumn = columns[columnIndex];
			const key = resolveOptionalText(currentColumn.key, columnArg.key);
			const type = resolveOptionalText(currentColumn.type, columnArg.type);
			columns[columnIndex] = {
				...(key !== undefined && { key }),
				name:
					columnArg.name === undefined
						? currentColumn.name
						: rewriteText(currentColumn.name, columnArg.name),
				...(type !== undefined && { type }),
			};
		});
		const nextEntity: ErEntityDoc = {
			...entity,
			name: name === undefined ? entity.name : rewriteText(entity.name, name),
			columns,
		};
		// Refused rather than written back unchanged, which would leave an undo step
		// that takes back nothing
		if (
			JSON.stringify([nextEntity.name, nextEntity.columns]) ===
			JSON.stringify([entity.name, entity.columns])
		) {
			throw new Error(
				`erEntity "${entity.id}" already holds those texts; nothing was changed`,
			);
		}
		const changedColumns = [...seenColumns].filter(
			(columnIndex) =>
				JSON.stringify(columns[columnIndex]) !==
				JSON.stringify(entity.columns[columnIndex]),
		);
		const changeParts = [
			...(JSON.stringify(nextEntity.name) === JSON.stringify(entity.name)
				? []
				: ["the title"]),
			...(changedColumns.length === 0
				? []
				: [
						`column${changedColumns.length === 1 ? "" : "s"} ${changedColumns.sort((left, right) => left - right).join(", ")}`,
					]),
		];
		return {
			doc: nextEntity,
			text: `rewrote ${changeParts.join(" and ")} of erEntity "${entity.id}"; it has ${formatErEntityColumnSummary(columns)}`,
		};
	},
});
