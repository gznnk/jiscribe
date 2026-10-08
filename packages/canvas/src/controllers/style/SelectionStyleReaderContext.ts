import { createContext, useContext } from "react";

import type { SelectionValue } from "./SelectionValue";
import type { StyleEntryValueType, StyleTable } from "./StyleEntry";
import type { StyleIntentValueType } from "./StyleIntent";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Reports what the surrounding surface's selection says about one style intent —
 * `readSelectionStyle` bound to the state that surface is drawn for.
 */
export type SelectionStyleReader = <TKind extends string>(
	kind: TKind,
) => SelectionValue<StyleIntentValueType<TKind>>;

/**
 * Context that hands the rows of the floating menu and the properties sidebar a
 * reader for the selection's style, so a row drawn by a plugin states a value
 * the same way a built-in one does without being handed the controller state.
 *
 * ObjectMenu and PropertyPanel provide a reader bound to the state they render
 * for. There is no default: a reader answering without that state would report a
 * value that is not the canvas's, and a row showing the wrong value is a silent
 * failure. {@link useSelectionStyle} throws instead.
 */
export const SelectionStyleReaderContext =
	createContext<SelectionStyleReader | null>(null);

/**
 * What the current selection says about one style property: the one value it
 * agrees on, the several it does not, or none when nothing the selection reaches
 * takes that property at all.
 *
 * The value of exactly the objects a write of the same name would reach, read
 * through each type's own entry and resolved through its defaults — so a row
 * built on it cannot disagree with the write behind it. Fold it into something
 * drawable with the `selectionValue*` helpers.
 *
 * A row of a type that declared the property passes that type's table
 * (`ObjectTypeDefinition.style`) ahead of the kind, which types the answer from
 * the declaration — the table is read for its type alone, the walk still going
 * through each target's own registered one.
 *
 * @param kind - The style property to report: one of the core names (`"fill"`, `"fontSize"`, …), which fixes the value type, or a kind a type declared for itself, whose stored type the engine does not know and which therefore comes back `unknown` for the caller to narrow with a guard of its own
 * @returns `single` / `mixed` / `none` over that property's value type
 * @throws When rendered outside a `SelectionStyleReaderContext` provider; the
 *   rows of the floating menu and the properties sidebar are inside one
 */
export function useSelectionStyle<TKind extends string>(
	kind: TKind,
): SelectionValue<StyleIntentValueType<TKind>>;
/**
 * @param table - The table the kind is declared in, as its type hands it to `ObjectTypeDefinition.style`
 * @param kind - The style property to report, a key of `table`
 * @returns `single` / `mixed` / `none` over the value type that table's entry works in, so the row needs no guard of its own
 */
export function useSelectionStyle<
	TTable extends StyleTable<ObjectState>,
	TKind extends keyof TTable & string,
>(
	table: TTable,
	kind: TKind,
): SelectionValue<StyleEntryValueType<TTable[TKind]>>;
export function useSelectionStyle(
	kindOrTable: string | StyleTable<ObjectState>,
	tableKind?: string,
): SelectionValue<unknown> {
	// The declared-table signature only types the answer; the reader takes the
	// kind either way.
	const kind =
		typeof kindOrTable === "string" ? kindOrTable : (tableKind as string);
	const readStyle = useContext(SelectionStyleReaderContext);
	if (readStyle === null) {
		throw new Error(
			"useSelectionStyle: no SelectionStyleReaderContext provider above this component; a row reading the selection's style must be rendered inside the ObjectMenu or the properties sidebar",
		);
	}
	return readStyle(kind);
}
