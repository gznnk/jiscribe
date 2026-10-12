import { describe, expect, it } from "vitest";

import { TEXT_STYLE_INTENT_KINDS } from "../../../../../style/StyleIntent";
import type { ObjectMenuSection } from "../../ObjectMenuTypes";
import { filterMenuSectionsByPick } from "../filterMenuSectionsByPick";

const CustomItemComponent = (): null => null;

/** What a text slot pick receives (createTextSlotPartKindDefinition). */
const TEXT_KINDS = TEXT_STYLE_INTENT_KINDS;
/** What a table cell pick receives: the text and the fill. */
const TEXT_AND_FILL_KINDS: ReadonlySet<string> = new Set([
	...TEXT_STYLE_INTENT_KINDS,
	"fill",
]);

describe("filterMenuSectionsByPick", () => {
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

		expect(filterMenuSectionsByPick(sections, TEXT_KINDS)).toEqual([
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

	it("drops custom items even when they sit beside a kept text item", () => {
		const sections: ObjectMenuSection[] = [
			{
				id: "text",
				items: [
					{ type: "custom", id: "plugin-item", component: CustomItemComponent },
					{ type: "font" },
				],
			},
		];

		expect(filterMenuSectionsByPick(sections, TEXT_KINDS)).toEqual([
			{ id: "text", items: [{ type: "font" }] },
		]);
	});

	it("removes a section that the filter emptied", () => {
		const sections: ObjectMenuSection[] = [
			{ id: "line", items: [{ type: "lineColor" }, { type: "lineStyle" }] },
			{ id: "text", items: [{ type: "textAlignment" }] },
			{ id: "arrowHead", items: [{ type: "arrowHead" }] },
		];

		expect(filterMenuSectionsByPick(sections, TEXT_KINDS)).toEqual([
			{ id: "text", items: [{ type: "textAlignment" }] },
		]);
	});

	it("returns nothing when no section has a text item left", () => {
		const sections: ObjectMenuSection[] = [
			{ id: "style", items: [{ type: "backgroundColor" }] },
			{ id: "system-group", items: [{ type: "group" }] },
		];

		expect(filterMenuSectionsByPick(sections, TEXT_KINDS)).toEqual([]);
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

		expect(filterMenuSectionsByPick(sections, TEXT_AND_FILL_KINDS)).toEqual([
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
			filterMenuSectionsByPick(
				sections,
				new Set(["strokeWidth", "startArrow"]),
			),
		).toEqual([]);
	});

	it("keeps a multi-kind item once every kind is received", () => {
		const sections: ObjectMenuSection[] = [
			{ id: "line", items: [{ type: "lineStyle" }] },
		];

		expect(
			filterMenuSectionsByPick(
				sections,
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
			filterMenuSectionsByPick(sections, new Set(["fill", "group"])),
		).toEqual([]);
	});

	it("drops the text items under a pick receiving none of the text kinds", () => {
		const sections: ObjectMenuSection[] = [
			{ id: "style", items: [{ type: "backgroundColor" }] },
			{ id: "text", items: [{ type: "font" }, { type: "textFormat" }] },
		];

		expect(filterMenuSectionsByPick(sections, new Set(["fill"]))).toEqual([
			{ id: "style", items: [{ type: "backgroundColor" }] },
		]);
	});
});
