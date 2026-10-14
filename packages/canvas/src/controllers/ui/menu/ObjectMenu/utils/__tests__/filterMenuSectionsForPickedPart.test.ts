import { describe, expect, it } from "vitest";

import { TEXT_STYLE_INTENT_KINDS } from "../../../../../style/StyleIntent";
import type { ObjectMenuSection } from "../../ObjectMenuTypes";
import { filterMenuSectionsForPickedPart } from "../filterMenuSectionsForPickedPart";

const CustomItemComponent = (): null => null;

/** What a text slot pick receives (createTextSlotPartKindDefinition). */
const TEXT_KINDS = TEXT_STYLE_INTENT_KINDS;
/** What a table cell pick receives: the text and the fill. */
const TEXT_AND_FILL_KINDS: ReadonlySet<string> = new Set([
	...TEXT_STYLE_INTENT_KINDS,
	"fill",
]);

/** The kind every pick below is of, unless a case says otherwise; no custom item below names it. */
const PICKED_KIND = "textSlot";

describe("filterMenuSectionsForPickedPart", () => {
	it("keeps the text items and drops every other builtin", () => {
		const sections: ObjectMenuSection[] = [
			{
				id: "style",
				items: [
					{ type: "backgroundColor" },
					{ type: "borderColor" },
					{ type: "borderStyle", radius: true },
				],
			},
			{
				id: "text",
				items: [
					{ type: "font" },
					{ type: "textFormat" },
					{ type: "textAlignment" },
				],
			},
			{ id: "system-group", items: [{ type: "group" }] },
		];

		expect(
			filterMenuSectionsForPickedPart(sections, PICKED_KIND, TEXT_KINDS),
		).toEqual([
			{
				id: "text",
				items: [
					{ type: "font" },
					{ type: "textFormat" },
					{ type: "textAlignment" },
				],
			},
		]);
	});

	it("drops custom items not naming the picked kind, even beside a kept text item", () => {
		const sections: ObjectMenuSection[] = [
			{
				id: "text",
				items: [
					{ type: "custom", id: "plugin-item", component: CustomItemComponent },
					{ type: "font" },
				],
			},
		];

		expect(
			filterMenuSectionsForPickedPart(sections, PICKED_KIND, TEXT_KINDS),
		).toEqual([{ id: "text", items: [{ type: "font" }] }]);
	});

	it("removes a section that the filter emptied", () => {
		const sections: ObjectMenuSection[] = [
			{ id: "line", items: [{ type: "lineColor" }, { type: "lineStyle" }] },
			{ id: "text", items: [{ type: "textAlignment" }] },
			{ id: "arrowHead", items: [{ type: "arrowHead" }] },
		];

		expect(
			filterMenuSectionsForPickedPart(sections, PICKED_KIND, TEXT_KINDS),
		).toEqual([{ id: "text", items: [{ type: "textAlignment" }] }]);
	});

	it("returns nothing when no section has a text item left", () => {
		const sections: ObjectMenuSection[] = [
			{ id: "style", items: [{ type: "backgroundColor" }] },
			{ id: "system-group", items: [{ type: "group" }] },
		];

		expect(
			filterMenuSectionsForPickedPart(sections, PICKED_KIND, TEXT_KINDS),
		).toEqual([]);
	});

	it("keeps an item whose every kind the picked kind receives", () => {
		const sections: ObjectMenuSection[] = [
			{
				id: "style",
				items: [
					{ type: "backgroundColor" },
					{ type: "borderColor" },
					{ type: "borderStyle", radius: false },
				],
			},
			{ id: "text", items: [{ type: "font" }] },
		];

		expect(
			filterMenuSectionsForPickedPart(
				sections,
				PICKED_KIND,
				TEXT_AND_FILL_KINDS,
			),
		).toEqual([
			{ id: "style", items: [{ type: "backgroundColor" }] },
			{ id: "text", items: [{ type: "font" }] },
		]);
	});

	it("drops an item only some of whose kinds the picked kind receives", () => {
		const sections: ObjectMenuSection[] = [
			{
				id: "style",
				items: [{ type: "borderStyle", radius: true }, { type: "arrowHead" }],
			},
		];

		expect(
			filterMenuSectionsForPickedPart(
				sections,
				PICKED_KIND,
				new Set(["strokeWidth", "startArrow"]),
			),
		).toEqual([]);
	});

	it("keeps a multi-kind item once every kind is received", () => {
		const sections: ObjectMenuSection[] = [
			{ id: "line", items: [{ type: "lineStyle" }] },
		];

		expect(
			filterMenuSectionsForPickedPart(
				sections,
				PICKED_KIND,
				new Set(["strokeWidth", "strokeDashType"]),
			),
		).toEqual(sections);
	});

	it("drops custom items and items raising no style kind whatever is received", () => {
		const sections: ObjectMenuSection[] = [
			{
				id: "style",
				items: [{ type: "custom", id: "fill", component: CustomItemComponent }],
			},
			{ id: "system-group", items: [{ type: "group" }] },
			{ id: "reference", items: [{ type: "openReference" }] },
		];

		expect(
			filterMenuSectionsForPickedPart(
				sections,
				PICKED_KIND,
				new Set(["fill", "group"]),
			),
		).toEqual([]);
	});

	it("drops the text items under a pick receiving none of the text kinds", () => {
		const sections: ObjectMenuSection[] = [
			{ id: "style", items: [{ type: "backgroundColor" }] },
			{ id: "text", items: [{ type: "font" }, { type: "textFormat" }] },
		];

		expect(
			filterMenuSectionsForPickedPart(sections, PICKED_KIND, new Set(["fill"])),
		).toEqual([{ id: "style", items: [{ type: "backgroundColor" }] }]);
	});

	it("keeps a custom item naming the picked kind, whatever the pick receives", () => {
		const sections: ObjectMenuSection[] = [
			{
				id: "insert",
				items: [
					{
						type: "custom",
						id: "insert-tracks",
						component: CustomItemComponent,
						pickedPartKinds: ["row", "column"],
					},
				],
			},
		];
		const keptIds = (pickedPartKind: string): string[] =>
			filterMenuSectionsForPickedPart(
				sections,
				pickedPartKind,
				new Set<string>(),
			).map((section) => section.id);

		expect(keptIds("row")).toEqual(["insert"]);
		expect(keptIds("column")).toEqual(["insert"]);
		expect(keptIds("textSlot")).toEqual([]);
	});

	it("drops a custom item naming no kind at all", () => {
		expect(
			filterMenuSectionsForPickedPart(
				[
					{
						id: "insert",
						items: [
							{
								type: "custom",
								id: "insert-tracks",
								component: CustomItemComponent,
								pickedPartKinds: [],
							},
						],
					},
				],
				"row",
				TEXT_KINDS,
			),
		).toEqual([]);
	});
});
