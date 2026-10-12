import type { BuiltinControlStyleKinds } from "../../utils/isKeptUnderTextSlot";
import { isKeptUnderTextSlot } from "../../utils/isKeptUnderTextSlot";
import type { BuiltinItemKey, ObjectMenuSection } from "../ObjectMenuTypes";

/**
 * What each builtin item edits, which is what the text-slot narrowing decides it
 * by: `"text"` for an item whose write lands on the addressed slot, otherwise the
 * style kinds it reads and writes (`useSelectionStyle`). An empty list is an item
 * that edits no style (grouping, opening a reference).
 */
const BUILTIN_ITEM_STYLE_KINDS = {
	arrowHead: ["startArrow", "endArrow"],
	lineColor: ["stroke"],
	lineStyle: ["strokeWidth", "strokeDashType"],
	backgroundColor: ["fill"],
	borderColor: ["stroke"],
	borderStyle: ["strokeWidth", "strokeDashType", "cornerRadius"],
	font: "text",
	textFormat: "text",
	textAlignment: "text",
	group: [],
	openReference: [],
} as const satisfies Record<BuiltinItemKey, BuiltinControlStyleKinds>;

/**
 * Narrows menu sections down to the items that operate on a selected text slot
 * or the text being edited: the text items, and an item whose every style kind
 * the addressed object's type declares in its own `styleEntries` — such a type
 * has said where that kind lands under a pick. Custom items are dropped, since a
 * plugin item has no way to say what it edits. Sections left empty are removed
 * so no divider survives on its own.
 *
 * @param sections - The selection's sections before narrowing
 * @param declaredKinds - The kinds the addressed object's type declares (getAddressedDeclaredKinds); empty keeps the text items alone
 */
export const filterTextSlotMenuSections = (
	sections: ObjectMenuSection[],
	declaredKinds: ReadonlySet<string>,
): ObjectMenuSection[] =>
	sections
		.map((section) => ({
			id: section.id,
			items: section.items.filter((item) => {
				if (item.type === "custom") {
					return false;
				}
				return isKeptUnderTextSlot(
					BUILTIN_ITEM_STYLE_KINDS[item.type],
					declaredKinds,
				);
			}),
		}))
		.filter((section) => section.items.length > 0);
