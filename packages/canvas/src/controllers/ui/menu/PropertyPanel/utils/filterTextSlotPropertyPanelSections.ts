import type { BuiltinControlStyleKinds } from "../../utils/isKeptUnderTextSlot";
import { isKeptUnderTextSlot } from "../../utils/isKeptUnderTextSlot";
import type {
	PropertyPanelBuiltinItemKey,
	PropertyPanelSection,
} from "../PropertyPanelTypes";

/**
 * What each builtin row edits, which is what the text-slot narrowing decides it
 * by: `"text"` for a row whose write lands on the addressed slot, otherwise the
 * style kinds it reads and writes (`useSelectionStyle`). An empty list is a row
 * that edits no style kind: the frame, the two resize switches.
 */
const BUILTIN_ROW_STYLE_KINDS = {
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
	BuiltinControlStyleKinds
>;

/**
 * Narrows the sidebar sections down to the rows a selected text slot or the text
 * being edited can receive: the text rows, and a row whose every style kind the
 * addressed object's type declares in its own `styleEntries` — such a type has
 * said where that kind lands under a pick. Custom rows are dropped, since a
 * plugin row has no way to say what it edits. A section left empty is dropped so
 * no accordion header survives on its own.
 *
 * @param sections - The selection's sections before narrowing
 * @param declaredKinds - The kinds the addressed object's type declares (getAddressedDeclaredKinds); empty keeps the text rows alone
 */
export const filterTextSlotPropertyPanelSections = (
	sections: PropertyPanelSection[],
	declaredKinds: ReadonlySet<string>,
): PropertyPanelSection[] =>
	sections
		.map((section) => ({
			...section,
			items: section.items.filter((item) => {
				if (item.type === "custom") {
					return false;
				}
				return isKeptUnderTextSlot(
					BUILTIN_ROW_STYLE_KINDS[item.type],
					declaredKinds,
				);
			}),
		}))
		.filter((section) => section.items.length > 0);
