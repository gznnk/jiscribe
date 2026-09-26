import { describe, expect, it } from "vitest";

import type { ObjectFeatures } from "../../../model/objects/types/ObjectFeatures";
import type { ObjectTreeNode } from "../../utils/mapObjectTree";
import { migrateSourceRuns } from "../migrateSourceRuns";

const sourceFeatures: ObjectFeatures = {
	type: "markdown",
	geometry: "rect",
	transform: true,
	text: "source",
};

const bodyFeatures: ObjectFeatures = {
	...sourceFeatures,
	type: "rect",
	text: "body",
};

const card = (text: unknown): ObjectTreeNode => ({
	id: "m1",
	type: "markdown",
	x: 0,
	y: 0,
	width: 10,
	height: 10,
	text,
});

const migrate = (node: ObjectTreeNode, features = sourceFeatures) =>
	migrateSourceRuns(node, "root[0]", features);

describe("migrateSourceRuns", () => {
	it("reads the runs as their plain text and says so", () => {
		const result = migrate(
			card([{ text: "a" }, { text: "b", fontWeight: "bold" }]),
		);
		expect(result.node.text).toBe("ab");
		expect(result.warnings).toEqual([
			{
				path: "root[0].text",
				message:
					'text was written as styled runs, which a "markdown" body does not take: it is read as the plain text and rewritten so on save.',
				severity: "warning",
			},
		]);
	});

	it("changes nothing on the result of its own rewrite", () => {
		const once = migrate(card([{ text: "a" }, { text: "b" }]));
		const twice = migrate(once.node);
		expect(twice.node).toBe(once.node);
		expect(twice.warnings).toEqual([]);
	});

	it("leaves a body already written as a plain string alone", () => {
		const node = card("# title");
		expect(migrate(node).node).toBe(node);
		expect(migrate(node).warnings).toEqual([]);
	});

	it("leaves an array holding anything but runs for the validator to reject", () => {
		const node = card([{ text: "a" }, { text: 1 }]);
		expect(migrate(node).node).toBe(node);
		expect(migrate(node).warnings).toEqual([]);
	});

	it("leaves the empty list of runs to migrateEmptyRunList", () => {
		const node = card([]);
		expect(migrate(node).node).toBe(node);
		expect(migrate(node).warnings).toEqual([]);
	});

	it("leaves a styled body alone on a type whose text takes runs", () => {
		const node = card([{ text: "a", fontWeight: "bold" }]);
		expect(migrate(node, bodyFeatures).node).toBe(node);
		expect(migrate(node, bodyFeatures).warnings).toEqual([]);
	});
});
