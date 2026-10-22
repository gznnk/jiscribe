import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { pickShapeStyleFields } from "../pickShapeStyleFields";

const objectWith = (fields: Record<string, unknown>): ObjectState =>
	({ id: "shape", type: "rect", ...fields }) as unknown as ObjectState;

describe("pickShapeStyleFields", () => {
	it("passes on every shape-style field holding its own type", () => {
		const picked = pickShapeStyleFields(
			objectWith({
				stroke: "#111111",
				strokeWidth: 2,
				strokeDashType: "dashed",
				strokeOpacity: 0.5,
				fill: "auto",
				fillOpacity: 0,
				rx: 4,
				startArrow: "OpenArrow",
				endArrow: "FilledTriangle",
			}),
		);

		expect(picked).toEqual({
			stroke: "#111111",
			strokeWidth: 2,
			strokeDashType: "dashed",
			strokeOpacity: 0.5,
			fill: "auto",
			fillOpacity: 0,
			rx: 4,
			startArrow: "OpenArrow",
			endArrow: "FilledTriangle",
		});
	});

	it("drops a field holding the wrong type, so resolution takes over for it", () => {
		const picked = pickShapeStyleFields(
			objectWith({
				stroke: 0,
				strokeWidth: "2",
				strokeDashType: "wavy",
				fill: null,
				endArrow: "harpoon",
				rx: 3,
			}),
		);

		expect(picked).toEqual({ rx: 3 });
	});

	it("leaves out every field that is not a shape-style field", () => {
		const picked = pickShapeStyleFields(
			objectWith({ cx: 10, width: 20, fontSize: 12, stroke: "#000000" }),
		);

		expect(picked).toEqual({ stroke: "#000000" });
	});

	it("yields an empty bag for an object setting none of the fields", () => {
		expect(pickShapeStyleFields(objectWith({}))).toEqual({});
	});
});
