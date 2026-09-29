import { describe, expect, it } from "vitest";

import type { ObjectMenuSection } from "../../ObjectMenuTypes";
import { filterTextSlotMenuSections } from "../filterTextSlotMenuSections";

const CustomItemComponent = (): null => null;

describe("filterTextSlotMenuSections", () => {
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

		expect(filterTextSlotMenuSections(sections)).toEqual([
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

		expect(filterTextSlotMenuSections(sections)).toEqual([
			{ id: "text", items: [{ type: "font" }] },
		]);
	});

	it("keeps a custom item that declares itself slot-aware", () => {
		const slotAwareItem = {
			type: "custom" as const,
			id: "cell-fill",
			component: CustomItemComponent,
			slotAware: true,
		};
		const sections: ObjectMenuSection[] = [
			{
				id: "style",
				items: [slotAwareItem, { type: "backgroundColor" }],
			},
		];

		// Its section survives on the strength of that one item, where the builtin
		// beside it goes.
		expect(filterTextSlotMenuSections(sections)).toEqual([
			{ id: "style", items: [slotAwareItem] },
		]);
	});

	it("drops a custom item that states slotAware false", () => {
		const sections: ObjectMenuSection[] = [
			{
				id: "style",
				items: [
					{
						type: "custom",
						id: "plugin-item",
						component: CustomItemComponent,
						slotAware: false,
					},
				],
			},
		];

		expect(filterTextSlotMenuSections(sections)).toEqual([]);
	});

	it("removes a section that the filter emptied", () => {
		const sections: ObjectMenuSection[] = [
			{ id: "line", items: [{ type: "lineColor" }, { type: "lineStyle" }] },
			{ id: "text", items: [{ type: "textAlignment" }] },
			{ id: "arrowHead", items: [{ type: "arrowHead" }] },
		];

		expect(filterTextSlotMenuSections(sections)).toEqual([
			{ id: "text", items: [{ type: "textAlignment" }] },
		]);
	});

	it("returns nothing when no section has a text item left", () => {
		const sections: ObjectMenuSection[] = [
			{ id: "style", items: [{ type: "backgroundColor" }] },
			{ id: "system-group", items: [{ type: "group" }] },
		];

		expect(filterTextSlotMenuSections(sections)).toEqual([]);
	});
});
