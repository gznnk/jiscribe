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
 * text items under a text slot, the background too under a table cell. Custom
 * items are dropped, since a plugin item has no way to say what it raises.
 * Sections left empty are removed so no divider survives on its own.
 *
 * @param sections - The selection's sections before narrowing
 * @param styleIntentKinds - What the picked kind receives (readPickedPartStyleIntentKinds)
 */
export const filterMenuSectionsForPickedPart = (
	sections: ObjectMenuSection[],
	styleIntentKinds: ReadonlySet<string>,
): ObjectMenuSection[] =>
	sections
		.map((section) => ({
			id: section.id,
			items: section.items.filter(
				(item) =>
					item.type !== "custom" &&
					isControlWithinStyleIntentKinds(
						BUILTIN_ITEM_STYLE_INTENT_KINDS[item.type],
						styleIntentKinds,
					),
			),
		}))
		.filter((section) => section.items.length > 0);
