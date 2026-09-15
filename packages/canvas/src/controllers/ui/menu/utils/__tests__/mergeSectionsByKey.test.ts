import { describe, expect, it } from "vitest";

import { mergeSectionsByKey } from "../mergeSectionsByKey";

type TestItem = { type: string; id?: string; radius?: boolean };
type TestSection = { id: string; label?: string; items: TestItem[] };

/** The identity both menus use: the declared id for a custom row, the kind otherwise. */
const itemKey = (item: TestItem): string =>
	item.type === "custom" ? (item.id ?? "") : item.type;

describe("mergeSectionsByKey", () => {
	it("returns an empty list when no type contributed one", () => {
		expect(mergeSectionsByKey<TestItem, TestSection>([], itemKey)).toEqual([]);
	});

	it("returns a lone list untouched, item objects included", () => {
		const item: TestItem = { type: "fill" };
		const sections: TestSection[] = [{ id: "style", items: [item] }];

		const merged = mergeSectionsByKey([sections], itemKey);

		expect(merged).toBe(sections);
		expect(merged[0].items[0]).toBe(item);
	});

	it("keeps only the sections every type declares", () => {
		const merged = mergeSectionsByKey<TestItem, TestSection>(
			[
				[
					{ id: "style", items: [{ type: "fill" }] },
					{ id: "text", items: [{ type: "fontSize" }] },
				],
				[{ id: "style", items: [{ type: "fill" }] }],
			],
			itemKey,
		);

		expect(merged).toEqual([{ id: "style", items: [{ type: "fill" }] }]);
	});

	it("keeps only the items every copy of a surviving section declares", () => {
		const merged = mergeSectionsByKey<TestItem, TestSection>(
			[
				[{ id: "style", items: [{ type: "fill" }, { type: "stroke" }] }],
				[{ id: "style", items: [{ type: "stroke" }] }],
			],
			itemKey,
		);

		expect(merged).toEqual([{ id: "style", items: [{ type: "stroke" }] }]);
	});

	it("drops a section the merge emptied", () => {
		const merged = mergeSectionsByKey<TestItem, TestSection>(
			[
				[{ id: "style", items: [{ type: "fill" }] }],
				[{ id: "style", items: [{ type: "stroke" }] }],
			],
			itemKey,
		);

		expect(merged).toEqual([]);
	});

	it("carries the first list's other section fields over", () => {
		const merged = mergeSectionsByKey<TestItem, TestSection>(
			[
				[{ id: "style", label: "Style", items: [{ type: "fill" }] }],
				[{ id: "style", label: "Face", items: [{ type: "fill" }] }],
			],
			itemKey,
		);

		expect(merged).toEqual([
			{ id: "style", label: "Style", items: [{ type: "fill" }] },
		]);
	});

	it("keeps a custom item every type declares under the same id", () => {
		const merged = mergeSectionsByKey<TestItem, TestSection>(
			[
				[{ id: "fill", items: [{ type: "custom", id: "header-fill" }] }],
				[{ id: "fill", items: [{ type: "custom", id: "header-fill" }] }],
			],
			itemKey,
		);

		expect(merged).toEqual([
			{ id: "fill", items: [{ type: "custom", id: "header-fill" }] },
		]);
	});

	it("drops custom items the types spell differently, though both are custom", () => {
		const merged = mergeSectionsByKey<TestItem, TestSection>(
			[
				[
					{
						id: "fill",
						items: [{ type: "fill" }, { type: "custom", id: "header-fill" }],
					},
				],
				[
					{
						id: "fill",
						items: [{ type: "fill" }, { type: "custom", id: "footer-fill" }],
					},
				],
			],
			itemKey,
		);

		expect(merged).toEqual([{ id: "fill", items: [{ type: "fill" }] }]);
	});

	it("hands every type's variant of a surviving item to mergeItems, in order", () => {
		const seen: TestItem[][] = [];
		mergeSectionsByKey<TestItem, TestSection>(
			[
				[{ id: "style", items: [{ type: "border", radius: true }] }],
				[{ id: "style", items: [{ type: "border", radius: false }] }],
			],
			itemKey,
			(items) => {
				seen.push(items);
				return items[0];
			},
		);

		expect(seen).toEqual([
			[
				{ type: "border", radius: true },
				{ type: "border", radius: false },
			],
		]);
	});

	it("takes the item mergeItems returns", () => {
		const merged = mergeSectionsByKey<TestItem, TestSection>(
			[
				[{ id: "style", items: [{ type: "border", radius: true }] }],
				[{ id: "style", items: [{ type: "border", radius: false }] }],
			],
			itemKey,
			(items) => ({
				type: "border",
				radius: items.every((item) => item.radius === true),
			}),
		);

		expect(merged).toEqual([
			{ id: "style", items: [{ type: "border", radius: false }] },
		]);
	});
});
