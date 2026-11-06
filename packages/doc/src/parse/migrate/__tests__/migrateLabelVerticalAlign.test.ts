import { describe, expect, it } from "vitest";

import type { ObjectFeatures } from "../../../model/objects/types/ObjectFeatures";
import type { ObjectTreeNode } from "../../utils/mapObjectTree";
import { migrateLabelVerticalAlign } from "../migrateLabelVerticalAlign";

const labelFeatures: ObjectFeatures = {
	type: "awsIcon",
	geometry: "rect",
	transform: true,
	text: "label",
};

const icon = (extra: Record<string, unknown> = {}): ObjectTreeNode => ({
	id: "a1",
	type: "awsIcon",
	x: 0,
	y: 0,
	width: 64,
	height: 64,
	text: "Lambda",
	...extra,
});

const migrate = (node: ObjectTreeNode, features = labelFeatures) =>
	migrateLabelVerticalAlign(node, "root[0]", features);

describe("migrateLabelVerticalAlign", () => {
	it("drops the vertical placement off a label type and says so", () => {
		const result = migrate(icon({ verticalAlign: "top", fontSize: 12 }));
		expect(result.node).toEqual(icon({ fontSize: 12 }));
		expect(result.warnings).toEqual([
			{
				path: "root[0].verticalAlign",
				message:
					'verticalAlign is not taken by type "awsIcon", whose label is sized from its own text: it is dropped, and the next save writes the object without it.',
				severity: "warning",
			},
		]);
	});

	it("changes nothing on the result of its own rewrite", () => {
		const once = migrate(icon({ verticalAlign: "middle" }));
		const twice = migrate(once.node);
		expect(twice.node).toBe(once.node);
		expect(twice.warnings).toEqual([]);
	});

	it("leaves a label type stating no vertical placement alone", () => {
		const node = icon();
		expect(migrate(node).node).toBe(node);
		expect(migrate(node).warnings).toEqual([]);
	});

	it("leaves the vertical placement of a body type alone", () => {
		const node = icon({ type: "rect", verticalAlign: "top" });
		const result = migrate(node, {
			...labelFeatures,
			type: "rect",
			text: "body",
		});
		expect(result.node).toBe(node);
		expect(result.warnings).toEqual([]);
	});
});
