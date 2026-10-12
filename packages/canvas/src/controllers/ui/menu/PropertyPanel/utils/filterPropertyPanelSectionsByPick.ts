import type { BuiltinControlStyleIntentKinds } from "../../utils/isReceivedByPick";
import { isReceivedByPick } from "../../utils/isReceivedByPick";
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
 * text rows under a text slot, the fill too under a table cell. Custom rows are
 * dropped, since a plugin row has no way to say what it raises. A section left
 * empty is dropped so no accordion header survives on its own.
 *
 * @param sections - The selection's sections before narrowing
 * @param pickedIntentKinds - What the picked kind receives (readPickedStyleIntentKinds)
 */
export const filterPropertyPanelSectionsByPick = (
	sections: PropertyPanelSection[],
	pickedIntentKinds: ReadonlySet<string>,
): PropertyPanelSection[] =>
	sections
		.map((section) => ({
			...section,
			items: section.items.filter(
				(item) =>
					item.type !== "custom" &&
					isReceivedByPick(
						BUILTIN_ROW_STYLE_INTENT_KINDS[item.type],
						pickedIntentKinds,
					),
			),
		}))
		.filter((section) => section.items.length > 0);
