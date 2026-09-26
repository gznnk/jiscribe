import { describe, expect, it } from "vitest";

import type { ObjectFeatures } from "../../../model/objects/types/ObjectFeatures";
import type { ObjectTreeNode } from "../../utils/mapObjectTree";
import { migrateEmptyRunList } from "../migrateEmptyRunList";

const bodyFeatures: ObjectFeatures = {
	type: "rect",
	geometry: "rect",
	transform: true,
	text: "body",
};

const sourceFeatures: ObjectFeatures = {
	...bodyFeatures,
	type: "markdown",
	text: "source",
};

const slotsFeatures: ObjectFeatures = {
	...bodyFeatures,
	type: "record",
	text: "slots",
};

const untextedFeatures: ObjectFeatures = { type: "group", geometry: "none" };

const shape = (over: Record<string, unknown>): ObjectTreeNode => ({
	id: "o1",
	type: "rect",
	x: 0,
	y: 0,
	width: 10,
	height: 10,
	...over,
});

const migrate = (node: ObjectTreeNode, features: ObjectFeatures) =>
	migrateEmptyRunList(node, "root[0]", features);

describe("migrateEmptyRunList", () => {
	describe("a single body", () => {
		it("drops the field and says so", () => {
			const result = migrate(shape({ text: [], fontSize: 12 }), bodyFeatures);
			expect(result.node).toEqual(shape({ fontSize: 12 }));
			expect(result.warnings).toEqual([
				{
					path: "root[0].text",
					message:
						"text was an empty list of runs: it is read as an empty text and the field is dropped on save.",
					severity: "warning",
				},
			]);
		});

		it("drops it on a source body too", () => {
			const result = migrate(shape({ text: [] }), sourceFeatures);
			expect("text" in result.node).toBe(false);
			expect(result.warnings).toHaveLength(1);
		});

		it("changes nothing on the result of its own rewrite", () => {
			const once = migrate(shape({ text: [] }), bodyFeatures);
			const twice = migrate(once.node, bodyFeatures);
			expect(twice.node).toBe(once.node);
			expect(twice.warnings).toEqual([]);
		});

		it("leaves an absent text, an empty string and a non-empty run list alone", () => {
			[
				shape({}),
				shape({ text: "" }),
				shape({ text: [{ text: "a" }] }),
			].forEach((node) => {
				expect(migrate(node, bodyFeatures).node).toBe(node);
				expect(migrate(node, bodyFeatures).warnings).toEqual([]);
			});
		});

		it("leaves a malformed text for the validator to reject", () => {
			const node = shape({ text: 1 });
			expect(migrate(node, bodyFeatures).node).toBe(node);
			expect(migrate(node, bodyFeatures).warnings).toEqual([]);
		});
	});

	describe("named slots", () => {
		it('rewrites an empty row of a row list as "" and says so', () => {
			const node = shape({
				text: {
					name: { text: "User" },
					rows: { text: ["a", [], [{ text: "b" }], []], textAlign: "center" },
				},
			});
			const result = migrate(node, slotsFeatures);
			expect(result.node.text).toEqual({
				name: { text: "User" },
				rows: { text: ["a", "", [{ text: "b" }], ""], textAlign: "center" },
			});
			expect(result.warnings).toEqual([
				{
					path: "root[0].text.rows.text[1]",
					message:
						'text was an empty list of runs: it is read as an empty text and rewritten as "" on save.',
					severity: "warning",
				},
				{
					path: "root[0].text.rows.text[3]",
					message:
						'text was an empty list of runs: it is read as an empty text and rewritten as "" on save.',
					severity: "warning",
				},
			]);
		});

		it("copies only the slot it rewrote", () => {
			const node = shape({
				text: { name: { text: "User" }, rows: { text: [[]] } },
			});
			const slots = node.text as Record<string, unknown>;
			const migratedSlots = migrate(node, slotsFeatures).node.text as Record<
				string,
				unknown
			>;
			expect(migratedSlots).not.toBe(slots);
			expect(migratedSlots.name).toBe(slots.name);
			expect(migratedSlots.rows).not.toBe(slots.rows);
		});

		it("changes nothing on the result of its own rewrite", () => {
			const once = migrate(
				shape({ text: { rows: { text: [[]] } } }),
				slotsFeatures,
			);
			const twice = migrate(once.node, slotsFeatures);
			expect(twice.node).toBe(once.node);
			expect(twice.warnings).toEqual([]);
		});

		it("leaves a slot whose own text is the empty row list alone", () => {
			const node = shape({
				text: { name: { text: "User" }, rows: { text: [] } },
			});
			expect(migrate(node, slotsFeatures).node).toBe(node);
			expect(migrate(node, slotsFeatures).warnings).toEqual([]);
		});

		it("leaves a body slot and a malformed slot map for the validator", () => {
			[
				shape({ text: { name: { text: "" } } }),
				shape({ text: { name: { text: [{ text: "a" }] } } }),
				shape({ text: { name: 1 } }),
				shape({ text: [] }),
			].forEach((node) => {
				expect(migrate(node, slotsFeatures).node).toBe(node);
				expect(migrate(node, slotsFeatures).warnings).toEqual([]);
			});
		});
	});

	it("leaves a type holding no text alone", () => {
		const node = shape({ type: "group", text: [] });
		expect(migrate(node, untextedFeatures).node).toBe(node);
		expect(migrate(node, untextedFeatures).warnings).toEqual([]);
	});
});
