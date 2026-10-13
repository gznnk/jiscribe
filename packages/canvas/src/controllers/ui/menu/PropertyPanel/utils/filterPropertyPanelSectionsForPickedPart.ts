import type { BuiltinControlStyleIntentKinds } from "../../utils/isControlWithinStyleIntentKinds";
import { isControlWithinStyleIntentKinds } from "../../utils/isControlWithinStyleIntentKinds";
import type {
	PropertyPanelBuiltinItemKey,
	PropertyPanelSection,
} from "../PropertyPanelTypes";

/**
 * What each builtin row raises, which is what the narrowing under a pick
 * decides it by: `"text"` for a row on the text, otherwise the style kinds it
 * reads and writes (`useSelectionStyle`). An empty list is a row that raises no
 * style kind: the frame, the two resize switches.
 */
const BUILTIN_ROW_STYLE_INTENT_KINDS = {
	position: [],
	size: [],
	rotation: [],
	lockAspectRatio: [],
	autoHeight: [],
	fill: ["fill"],
	fillOpacity: ["fillOpacity"],
	strokeColor: ["stroke"],
	strokeWidth: ["strokeWidth"],
	strokeDashType: ["strokeDashType"],
	strokeOpacity: ["strokeOpacity"],
	radius: ["cornerRadius"],
	arrowHeads: ["startArrow", "endArrow"],
	fontFamily: "text",
	fontSize: "text",
	fontColor: "text",
	textFormat: "text",
	textAlign: "text",
	verticalAlign: "text",
	textVerticalBasis: "text",
	textLayout: "text",
} as const satisfies Record<
	PropertyPanelBuiltinItemKey,
	BuiltinControlStyleIntentKinds
>;

/**
 * Narrows the sidebar sections down to the rows a picked part receives: a row
 * whose every style kind is one the picked kind declares (`styleIntentKinds`) — the
 * text rows under a text slot, the fill too under a table cell. A custom row
 * stays only when it names the picked kind in `pickedPartKinds`, since it has no
 * other way to say it applies. A section left empty is dropped so no accordion
 * header survives on its own.
 *
 * @param sections - The selection's sections before narrowing
 * @param pickedPartKind - The picked part's kind (`selection.part.kind`), matched against each custom row's `pickedPartKinds`
 * @param styleIntentKinds - What the picked kind receives (readPickedPartStyleIntentKinds)
 */
export const filterPropertyPanelSectionsForPickedPart = (
	sections: PropertyPanelSection[],
	pickedPartKind: string,
	styleIntentKinds: ReadonlySet<string>,
): PropertyPanelSection[] =>
	sections
		.map((section) => ({
			...section,
			items: section.items.filter((item) => {
				if (item.type === "custom") {
					return item.pickedPartKinds?.includes(pickedPartKind) ?? false;
				}
				return isControlWithinStyleIntentKinds(
					BUILTIN_ROW_STYLE_INTENT_KINDS[item.type],
					styleIntentKinds,
				);
			}),
		}))
		.filter((section) => section.items.length > 0);
