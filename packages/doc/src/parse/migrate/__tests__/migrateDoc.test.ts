import { describe, expect, it } from "vitest";

import type { ObjectDocDefinition } from "../../../plugin/ObjectDocDefinition";
import { createDocValidatorRegistry } from "../../../registries/ObjectDocValidatorRegistry";
import { migrateDoc } from "../migrateDoc";

// The two text kinds the migrations care about beyond the built-in "body": no
// built-in type holds a source body or named slots, so both come from a plugin.
const markdownDefinition: ObjectDocDefinition = {
	features: {
		type: "markdown",
		geometry: "rect",
		transform: true,
		text: "source",
	},
	validateDoc: () => [],
};

const slottedDefinition: ObjectDocDefinition = {
	features: {
		type: "slotted",
		geometry: "rect",
		transform: true,
		text: "slots",
	},
	validateDoc: () => [],
};

const registry = createDocValidatorRegistry({
	plugins: [
		{
			id: "text-kinds-plugin",
			objects: { markdown: markdownDefinition, slotted: slottedDefinition },
		},
	],
});

const shape = (over: Record<string, unknown>) => ({
	id: "o1",
	type: "rect",
	x: 0,
	y: 0,
	width: 10,
	height: 10,
	...over,
});

const doc = (root: unknown[]) => ({ version: 1, root });

describe("migrateDoc", () => {
	it("returns anything without an object shape and a root array unchanged", () => {
		[null, 1, "text", [], {}, { version: 1 }, { root: 5 }].forEach((data) => {
			const result = migrateDoc(data, registry);
			expect(result.data).toBe(data);
			expect(result.warnings).toEqual([]);
		});
	});

	it("returns the input itself when there is no old form in it", () => {
		const data = doc([shape({ text: "a" })]);
		const result = migrateDoc(data, registry);
		expect(result.data).toBe(data);
		expect(result.warnings).toEqual([]);
	});

	it("applies both migrations and carries the object's id on each warning", () => {
		const data = doc([
			{ ...shape({ text: [{ text: "a" }, { text: "b" }] }), type: "markdown" },
			{ ...shape({ text: [] }), id: "o2" },
		]);
		const result = migrateDoc(data, registry);
		const root = (result.data as { root: Record<string, unknown>[] }).root;
		expect(root[0].text).toBe("ab");
		expect("text" in root[1]).toBe(false);
		expect(
			result.warnings.map((warning) => [warning.path, warning.id]),
		).toEqual([
			["root[0].text", "o1"],
			["root[1].text", "o2"],
		]);
	});

	it("reaches a group's children and copies only along their path", () => {
		const group = {
			id: "g1",
			type: "group",
			children: [shape({ text: "kept" }), { ...shape({ text: [] }), id: "o2" }],
		};
		const data = doc([shape({ text: "a" }), group]);
		const result = migrateDoc(data, registry);
		const root = (result.data as { root: unknown[] }).root;
		expect(root[0]).toBe(data.root[0]);
		expect(root[1]).not.toBe(group);
		const children = (root[1] as { children: Record<string, unknown>[] })
			.children;
		expect(children[0]).toBe(group.children[0]);
		expect("text" in children[1]).toBe(false);
		expect(result.warnings.map((warning) => warning.path)).toEqual([
			"root[1].children[1].text",
		]);
	});

	it("rewrites an empty row of a slotted type's row list", () => {
		const data = doc([
			{
				...shape({ text: { name: { text: "User" }, rows: { text: [[]] } } }),
				type: "slotted",
			},
		]);
		const result = migrateDoc(data, registry);
		const root = (result.data as { root: Record<string, unknown>[] }).root;
		expect(root[0].text).toEqual({
			name: { text: "User" },
			rows: { text: [""] },
		});
		expect(result.warnings.map((warning) => warning.path)).toEqual([
			"root[0].text.rows.text[0]",
		]);
	});

	it("changes nothing on a document it already migrated", () => {
		const once = migrateDoc(
			doc([
				{ ...shape({ text: [{ text: "a" }] }), type: "markdown" },
				{ ...shape({ text: [] }), id: "o2" },
				{
					...shape({ text: { rows: { text: [[]] } } }),
					id: "o3",
					type: "slotted",
				},
			]),
			registry,
		);
		const twice = migrateDoc(once.data, registry);
		expect(twice.data).toBe(once.data);
		expect(twice.warnings).toEqual([]);
	});

	it("never touches an object of a type the registry does not know", () => {
		const opaque = { id: "u1", type: "hexagram", text: [] };
		const data = doc([opaque]);
		const result = migrateDoc(data, registry);
		expect(result.data).toBe(data);
		expect(result.warnings).toEqual([]);
	});

	it("passes over an entry that is not an object or carries no string type", () => {
		const data = doc(["not an object", { id: "x", text: [] }]);
		const result = migrateDoc(data, registry);
		expect(result.data).toBe(data);
		expect(result.warnings).toEqual([]);
	});
});
