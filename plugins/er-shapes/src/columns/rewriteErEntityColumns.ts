import type { RichText, TextSlot } from "@jiscribe/doc";

import {
	countErEntityColumns,
	erEntityColumnTextSlotId,
} from "../schema/erEntityColumnIds";
import {
	ER_ENTITY_COLUMN_FIELDS,
	ER_ENTITY_NAME_TEXT_SLOT_ID,
} from "../schema/ErEntityDoc";
import type { ErEntityState } from "../state/ErEntityState";
import { reconcileErEntityBox } from "../state/reconcileErEntityBox";

/** Where one column of a rewrite comes from: the 0-based index of the column whose slots it takes, or null for a fresh column whose slots are all empty. */
export type ErEntityColumnSource = number | null;

/**
 * Rebuilds an entity's slots in a new column order and re-derives everything the
 * slots decide (reconcileErEntityBox), so the result is already the box the
 * columns draw, its top-left corner kept.
 *
 * @param state - The entity to rewrite; left untouched
 * @param columnSources - One entry per column of the result, in declared order: the 0-based index of the column of `state` whose slots it takes, or null for a fresh column of three empty slots
 * @returns A new state holding the title and exactly those columns, ids renumbered from 0
 */
export const rewriteErEntityColumns = (
	state: ErEntityState,
	columnSources: readonly ErEntityColumnSource[],
): ErEntityState => {
	const text: Record<string, TextSlot<RichText>> = {
		[ER_ENTITY_NAME_TEXT_SLOT_ID]: state.text[ER_ENTITY_NAME_TEXT_SLOT_ID] ?? {
			text: "",
		},
	};
	columnSources.forEach((sourceIndex, columnIndex) => {
		for (const field of ER_ENTITY_COLUMN_FIELDS) {
			const sourceSlot =
				sourceIndex === null
					? undefined
					: state.text[erEntityColumnTextSlotId(sourceIndex, field)];
			text[erEntityColumnTextSlotId(columnIndex, field)] = sourceSlot ?? {
				text: "",
			};
		}
	});
	return reconcileErEntityBox({ ...state, text });
};

/**
 * The column order of an entity as it stands, for {@link rewriteErEntityColumns}
 * to be handed with an entry added or taken out.
 *
 * @param state - The entity; its columns are counted off the slots (countErEntityColumns)
 * @returns `[0, 1, …, n - 1]`, empty for an entity of no columns
 */
export const listErEntityColumnIndices = (state: ErEntityState): number[] =>
	Array.from(
		{ length: countErEntityColumns(state.text) },
		(_unused, columnIndex) => columnIndex,
	);
