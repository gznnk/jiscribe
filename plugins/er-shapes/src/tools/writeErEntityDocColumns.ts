import type { ObjectAiToolChange } from "@jiscribe/canvas-sdk/tools";

import {
	formatErEntityColumnCount,
	formatErEntityColumnSpan,
} from "./erEntityToolText";
import { buildErEntityConnectPointRemap } from "../columns/buildErEntityConnectPointRemap";
import type { ErEntityColumnSource } from "../columns/ErEntityColumnSource";
import { calcErEntityLayout } from "../layout/calcErEntityLayout";
import { readErEntityDocLayoutInput } from "../layout/readErEntityLayoutSource";
import type { ErEntityColumnDoc, ErEntityDoc } from "../schema/ErEntityDoc";

/**
 * An entity doc holding new columns, with where its column connect points go
 * (buildErEntityConnectPointRemap). The drawn top-left corner the doc stores is
 * kept, so the box grows or shrinks at the bottom as the canvas commands do.
 *
 * @param entity - The entity before the change; left untouched
 * @param columns - The columns after it, in declared order
 * @param columnSources - One entry per entry of `columns`: the index it had in `entity`, or null for a new column
 * @returns The rewritten doc, and the remap when a connect point moved (omitted otherwise)
 */
export const writeErEntityDocColumns = (
	entity: ErEntityDoc,
	columns: ErEntityColumnDoc[],
	columnSources: readonly ErEntityColumnSource[],
): Omit<ObjectAiToolChange<ErEntityDoc>, "text"> => {
	const rewrittenEntity: ErEntityDoc = { ...entity, columns };
	const connectPointRemap = buildErEntityConnectPointRemap(
		calcErEntityLayout(readErEntityDocLayoutInput(entity)),
		calcErEntityLayout(readErEntityDocLayoutInput(rewrittenEntity)),
		columnSources,
	);
	return {
		doc: rewrittenEntity,
		...(Object.keys(connectPointRemap).length > 0 && { connectPointRemap }),
	};
};

/**
 * The column order of an entity as it stands, for a tool to rearrange.
 *
 * @param entity - The entity
 * @returns `[0, 1, …, n - 1]`, empty for an entity of no columns
 */
export const listErEntityDocColumnIndices = (entity: ErEntityDoc): number[] =>
	entity.columns.map((_column, columnIndex) => columnIndex);

/**
 * Refuses a column range the entity does not hold whole.
 *
 * @param entity - The entity the range is read against
 * @param column - First column of the range, 0-based
 * @param count - How many columns, at least 1
 */
export const requireErEntityColumnRange = (
	entity: ErEntityDoc,
	column: number,
	count: number,
): void => {
	const columnCount = entity.columns.length;
	if (column + count > columnCount) {
		const lastIndexText = columnCount === 0 ? "none" : `0-${columnCount - 1}`;
		throw new Error(
			`${formatErEntityColumnSpan(column, count)} would reach past the end: entity "${entity.id}" has ${formatErEntityColumnCount(columnCount)} (${lastIndexText})`,
		);
	}
};

/**
 * Refuses a text that would read as two lines: an entity's texts are one line each.
 *
 * @param text - The text as the call gives it
 * @param argPath - Where it was given, named in the refusal, e.g. "columns[1].name"
 */
export const requireSingleLineText = (text: string, argPath: string): void => {
	if (text.includes("\n")) {
		throw new Error(
			`${argPath} contains a newline: an entity's texts are one line each`,
		);
	}
};
