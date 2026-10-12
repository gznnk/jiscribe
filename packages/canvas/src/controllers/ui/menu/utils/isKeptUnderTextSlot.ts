import type { CoreStyleIntentKind } from "../../../style/StyleIntent";

/**
 * What one builtin control of the ObjectMenu or the sidebar edits: `"text"` for
 * a control whose write lands on the addressed text slot, otherwise the style
 * kinds it reads and writes (`useSelectionStyle`), empty for one that edits no
 * style kind at all (grouping, the frame rows).
 */
export type BuiltinControlStyleKinds = "text" | readonly CoreStyleIntentKind[];

/**
 * Whether the text-slot narrowing keeps one builtin control: a text control
 * always, any other only when every style kind it edits is one the addressed
 * object's type declares itself in `styleEntries` — such a type has said where
 * that kind lands under a pick. The one rule both surfaces narrow by
 * (filterTextSlotMenuSections, filterTextSlotPropertyPanelSections).
 *
 * @param styleKinds - What the control edits; an empty list is never kept
 * @param declaredKinds - The kinds the addressed type declares (getAddressedDeclaredKinds); empty keeps the text controls alone
 */
export const isKeptUnderTextSlot = (
	styleKinds: BuiltinControlStyleKinds,
	declaredKinds: ReadonlySet<string>,
): boolean =>
	styleKinds === "text" ||
	(styleKinds.length > 0 &&
		styleKinds.every((kind) => declaredKinds.has(kind)));
