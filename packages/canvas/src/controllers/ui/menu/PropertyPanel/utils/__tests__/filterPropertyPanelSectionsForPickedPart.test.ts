import { describe, expect, it } from "vitest";

import { TEXT_STYLE_INTENT_KINDS } from "../../../../../style/StyleIntent";
import type { PropertyPanelSection } from "../../PropertyPanelTypes";
import { filterPropertyPanelSectionsForPickedPart } from "../filterPropertyPanelSectionsForPickedPart";

const CustomRow = (): null => null;

/** The kind every pick below is of, unless a case says otherwise; no custom row of SECTIONS names it. */
const PICKED_KIND = "textSlot";

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

describe("filterPropertyPanelSectionsForPickedPart", () => {
	it("keeps the text rows alone under a pick receiving the text kinds alone", () => {
		expect(
			filterPropertyPanelSectionsForPickedPart(
				SECTIONS,
				PICKED_KIND,
				textAnd(),
			),
		).toEqual([
			{
				id: "text",
				label: "Text",
				items: [{ type: "fontSize" }, { type: "textAlign" }],
			},
		]);
	});

	it("keeps a row whose kind the pick receives, and only that row of its section (a table cell: fill, not its opacity)", () => {
		expect(
			filterPropertyPanelSectionsForPickedPart(
				SECTIONS,
				PICKED_KIND,
				textAnd("fill"),
			).map((section) => [section.id, section.items.map((item) => item.type)]),
		).toEqual([
			["fill", ["fill"]],
			["text", ["fontSize", "textAlign"]],
		]);
	});

	it("keeps a row naming two kinds only once both are received", () => {
		const arrowIds = (kinds: string[]): string[] =>
			filterPropertyPanelSectionsForPickedPart(
				SECTIONS,
				PICKED_KIND,
				textAnd(...kinds),
			).map((section) => section.id);

		expect(arrowIds(["startArrow"])).toEqual(["text"]);
		expect(arrowIds(["startArrow", "endArrow"])).toEqual(["arrow", "text"]);
	});

	it("drops custom rows not naming the picked kind, and the frame rows, whatever is received", () => {
		expect(
			filterPropertyPanelSectionsForPickedPart(
				SECTIONS,
				PICKED_KIND,
				textAnd("position", "size", "rotation", "header-fill"),
			).map((section) => section.id),
		).toEqual(["text"]);
	});

	it("keeps the label of a section that survives", () => {
		expect(
			filterPropertyPanelSectionsForPickedPart(
				SECTIONS,
				PICKED_KIND,
				new Set(["stroke"]),
			)[0],
		).toEqual({
			id: "stroke",
			label: "Border",
			items: [{ type: "strokeColor" }],
		});
	});

	it("drops the text rows under a pick receiving none of the text kinds", () => {
		expect(
			filterPropertyPanelSectionsForPickedPart(
				SECTIONS,
				PICKED_KIND,
				new Set(["fill"]),
			).map((section) => section.id),
		).toEqual(["fill"]);
	});

	it("keeps a custom row naming the picked kind, whatever the pick receives", () => {
		const sections: PropertyPanelSection[] = [
			{
				id: "insert",
				label: "Insert",
				items: [
					{
						type: "custom",
						id: "insert-tracks",
						component: CustomRow,
						pickedPartKinds: ["row", "column"],
					},
				],
			},
		];
		const keptIds = (pickedPartKind: string): string[] =>
			filterPropertyPanelSectionsForPickedPart(
				sections,
				pickedPartKind,
				new Set<string>(),
			).map((section) => section.id);

		expect(keptIds("row")).toEqual(["insert"]);
		expect(keptIds("column")).toEqual(["insert"]);
		expect(keptIds("textSlot")).toEqual([]);
	});

	it("drops a custom row naming no kind at all", () => {
		expect(
			filterPropertyPanelSectionsForPickedPart(
				[
					{
						id: "insert",
						label: "Insert",
						items: [
							{
								type: "custom",
								id: "insert-tracks",
								component: CustomRow,
								pickedPartKinds: [],
							},
						],
					},
				],
				"row",
				textAnd(),
			),
		).toEqual([]);
	});
});
