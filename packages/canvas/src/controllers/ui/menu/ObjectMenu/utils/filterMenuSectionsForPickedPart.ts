import type { BuiltinControlStyleIntentKinds } from "../../utils/isControlWithinStyleIntentKinds";
import { isControlWithinStyleIntentKinds } from "../../utils/isControlWithinStyleIntentKinds";
import type { BuiltinItemKey, ObjectMenuSection } from "../ObjectMenuTypes";

/**
 * What each builtin item raises, which is what the narrowing under a pick
 * decides it by: `"text"` for an item on the text, otherwise the style kinds it
 * reads and writes (`useSelectionStyle`). An empty list is an item that raises
 * no style kind (grouping, opening a reference).
 */
const BUILTIN_ITEM_STYLE_INTENT_KINDS = {
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
} as const satisfies Record<BuiltinItemKey, BuiltinControlStyleIntentKinds>;

/**
 * Narrows menu sections down to the items a picked part receives: an item
 * whose every style kind is one the picked kind declares (`styleIntentKinds`) — the
 * text items under a text slot, the background too under a table cell. A custom
 * item stays only when it names the picked kind in `pickedPartKinds`, since it
 * has no other way to say it applies. Sections left empty are removed so no
 * divider survives on its own.
 *
 * @param sections - The selection's sections before narrowing
 * @param pickedPartKind - The picked part's kind (`selection.part.kind`), matched against each custom item's `pickedPartKinds`
 * @param styleIntentKinds - What the picked kind receives (readPickedPartStyleIntentKinds)
 */
export const filterMenuSectionsForPickedPart = (
	sections: ObjectMenuSection[],
	pickedPartKind: string,
	styleIntentKinds: ReadonlySet<string>,
): ObjectMenuSection[] =>
	sections
		.map((section) => ({
			id: section.id,
			items: section.items.filter((item) => {
				if (item.type === "custom") {
					return item.pickedPartKinds?.includes(pickedPartKind) ?? false;
				}
				return isControlWithinStyleIntentKinds(
					BUILTIN_ITEM_STYLE_INTENT_KINDS[item.type],
					styleIntentKinds,
				);
			}),
		}))
		.filter((section) => section.items.length > 0);
