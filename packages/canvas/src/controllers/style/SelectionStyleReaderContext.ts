import { createContext, useContext } from "react";

import type { StyleIntentValueType } from "./StyleIntent";
import type { SelectionValue } from "../ui/menu/utils/SelectionValue";

/**
 * Reports what the surrounding surface's selection says about one style intent —
 * `readSelectionStyle` bound to the state that surface is drawn for.
 */
export type SelectionStyleReader = <K extends string>(
	kind: K,
) => SelectionValue<StyleIntentValueType<K>>;

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
 * @param kind - The style property to report: one of the engine's own names (`"fill"`, `"fontSize"`, …), which fixes the value type, or a name a shape declared for itself (`ExtraStyleProperties`), whose stored type the engine does not know and which therefore comes back `unknown` for the caller to narrow
 * @returns `single` / `mixed` / `none` over that property's value type
 * @throws When rendered outside a `SelectionStyleReaderContext` provider; the
 *   rows of the floating menu and the properties sidebar are inside one
 */
export const useSelectionStyle = <K extends string>(
	kind: K,
): SelectionValue<StyleIntentValueType<K>> => {
	const readStyle = useContext(SelectionStyleReaderContext);
	if (readStyle === null) {
		throw new Error(
			"useSelectionStyle: no SelectionStyleReaderContext provider above this component; a row reading the selection's style must be rendered inside the ObjectMenu or the properties sidebar",
		);
	}
	return readStyle(kind);
};
