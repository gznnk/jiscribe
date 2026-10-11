import type { TextType } from "@jiscribe/doc/model/objects/types/text/TextType";

import { textStyleTable } from "./textStyleTable";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { SlotsOf } from "../entries/slotEntry";
import type { DeclaredStyleTable, DeclaredStyleEntry } from "../StyleEntry";

/** Every text entry writes into the slots, which the doc holds under `text`. */
const TEXT_STYLE_FIELDS: readonly string[] = ["text"];

/**
 * The text half of the core table, as a type declares it to replace the derived
 * one with its own answer to which slots a whole-slot write lands on — a table
 * whose row pick reaches that row's cells rather than every cell. Spread into
 * `ObjectTypeDefinition.styleEntries`, it replaces the derived text kinds one for
 * one, so the type keeps the core's entries and changes only `slotsOf`.
 *
 * @param textType - The type's `ObjectFeatures.text`; it decides the kinds exactly as for the derived table (textStyleTable), so pass the same value the features declare
 * @param slotsOf - Which slots a whole-slot write and read reach, asked with the target and its pick (null with nothing picked inside it); `defaultSlotsOf` reproduces the derived table
 * @returns One entry per text kind the text type takes, `textContent` included, each stating `["text"]` as the field it writes
 * @template TState - The declaring type's state; `slotsOf` is only ever handed objects of that type
 */
export const declaredTextStyleTable = <TState extends ObjectState>(
	textType: TextType,
	slotsOf: SlotsOf<TState>,
): DeclaredStyleTable<TState> => {
	// The registry calls an entry with objects of the type it is registered for
	// alone, so narrowing the parameter back is what the declaring type promises.
	const table = textStyleTable(textType, slotsOf as SlotsOf<ObjectState>);
	const declared: Record<string, DeclaredStyleEntry<ObjectState, unknown>> = {};
	for (const [kind, entry] of Object.entries(table)) {
		if (entry !== undefined) {
			declared[kind] = { ...entry, fields: TEXT_STYLE_FIELDS };
		}
	}
	return declared as DeclaredStyleTable<TState>;
};
