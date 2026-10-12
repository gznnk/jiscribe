import { describe, expect, it } from "vitest";

import { TEXT_STYLE_INTENT_KINDS } from "../../../../../style/StyleIntent";
import type { PropertyPanelSection } from "../../PropertyPanelTypes";
import { filterPropertyPanelSectionsByPick } from "../filterPropertyPanelSectionsByPick";

const CustomRow = (): null => null;

/** What a pick receives: the text kinds, which a text slot pick receives alone, and `extraKinds`. */
const textAnd = (...extraKinds: string[]): ReadonlySet<string> =>
	new Set([...TEXT_STYLE_INTENT_KINDS, ...extraKinds]);

const SECTIONS: PropertyPanelSection[] = [
	{
		id: "layout",
		label: "Layout",
		items: [{ type: "position" }, { type: "size" }, { type: "rotation" }],
	},
	{
		id: "fill",
		label: "Fill",
		items: [
			{ type: "fill" },
			{ type: "fillOpacity" },
			{ type: "custom", id: "header-fill", component: CustomRow },
		],
	},
	{
		id: "stroke",
		label: "Border",
		items: [{ type: "strokeColor" }, { type: "strokeWidth" }],
	},
	{
		id: "arrow",
		label: "Arrows",
		items: [{ type: "arrowHeads" }],
	},
	{
		id: "text",
		label: "Text",
		items: [
			{ type: "fontSize" },
			{ type: "custom", id: "header-font", component: CustomRow },
			{ type: "textAlign" },
		],
	},
];

describe("filterPropertyPanelSectionsByPick", () => {
	it("keeps the text rows alone under a pick receiving the text kinds alone", () => {
		expect(filterPropertyPanelSectionsByPick(SECTIONS, textAnd())).toEqual([
			{
				id: "text",
				label: "Text",
				items: [{ type: "fontSize" }, { type: "textAlign" }],
			},
		]);
	});

	it("keeps a row whose kind the pick receives, and only that row of its section (a table cell: fill, not its opacity)", () => {
		expect(
			filterPropertyPanelSectionsByPick(SECTIONS, textAnd("fill")).map(
				(section) => [section.id, section.items.map((item) => item.type)],
			),
		).toEqual([
			["fill", ["fill"]],
			["text", ["fontSize", "textAlign"]],
		]);
	});

	it("keeps a row naming two kinds only once both are received", () => {
		const arrowIds = (kinds: string[]): string[] =>
			filterPropertyPanelSectionsByPick(SECTIONS, textAnd(...kinds)).map(
				(section) => section.id,
			);

		expect(arrowIds(["startArrow"])).toEqual(["text"]);
		expect(arrowIds(["startArrow", "endArrow"])).toEqual(["arrow", "text"]);
	});

	it("drops custom rows and the frame rows whatever is received", () => {
		expect(
			filterPropertyPanelSectionsByPick(
				SECTIONS,
				textAnd("position", "size", "rotation", "header-fill"),
			).map((section) => section.id),
		).toEqual(["text"]);
	});

	it("keeps the label of a section that survives", () => {
		expect(
			filterPropertyPanelSectionsByPick(SECTIONS, new Set(["stroke"]))[0],
		).toEqual({
			id: "stroke",
			label: "Border",
			items: [{ type: "strokeColor" }],
		});
	});

	it("drops the text rows under a pick receiving none of the text kinds", () => {
		expect(
			filterPropertyPanelSectionsByPick(SECTIONS, new Set(["fill"])).map(
				(section) => section.id,
			),
		).toEqual(["fill"]);
	});
});
