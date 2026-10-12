import { describe, expect, it } from "vitest";

import type { PropertyPanelSection } from "../../PropertyPanelTypes";
import { filterTextSlotPropertyPanelSections } from "../filterTextSlotPropertyPanelSections";

const CustomRow = (): null => null;

const NO_KINDS: ReadonlySet<string> = new Set();

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

describe("filterTextSlotPropertyPanelSections", () => {
	it("keeps the text rows alone when the type declares nothing", () => {
		expect(filterTextSlotPropertyPanelSections(SECTIONS, NO_KINDS)).toEqual([
			{
				id: "text",
				label: "Text",
				items: [{ type: "fontSize" }, { type: "textAlign" }],
			},
		]);
	});

	it("keeps a row whose kind the type declares, and only that row of its section", () => {
		expect(
			filterTextSlotPropertyPanelSections(SECTIONS, new Set(["fill"])).map(
				(section) => [section.id, section.items.map((item) => item.type)],
			),
		).toEqual([
			["fill", ["fill"]],
			["text", ["fontSize", "textAlign"]],
		]);
	});

	it("keeps a row naming two kinds only once both are declared", () => {
		const arrowIds = (kinds: string[]): string[] =>
			filterTextSlotPropertyPanelSections(SECTIONS, new Set(kinds)).map(
				(section) => section.id,
			);

		expect(arrowIds(["startArrow"])).toEqual(["text"]);
		expect(arrowIds(["startArrow", "endArrow"])).toEqual(["arrow", "text"]);
	});

	it("drops custom rows and the frame rows whatever is declared", () => {
		expect(
			filterTextSlotPropertyPanelSections(
				SECTIONS,
				new Set(["position", "size", "rotation", "header-fill"]),
			).map((section) => section.id),
		).toEqual(["text"]);
	});

	it("keeps the label of a section that survives", () => {
		expect(
			filterTextSlotPropertyPanelSections(SECTIONS, new Set(["stroke"]))[0],
		).toEqual({
			id: "stroke",
			label: "Border",
			items: [{ type: "strokeColor" }],
		});
	});
});
