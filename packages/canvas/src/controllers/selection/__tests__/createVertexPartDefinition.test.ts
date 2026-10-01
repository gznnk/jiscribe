import { describe, expect, it } from "vitest";

import type { PolylineState } from "../../../states/objects/primitives/polyline/PolylineState";
import { createVertexPartDefinition } from "../createVertexPartDefinition";

const polyline = {
	id: "p",
	type: "polyline",
	points: [
		{ x: 0, y: 0 },
		{ x: 10, y: 0 },
		{ x: 20, y: 0 },
	],
} as unknown as PolylineState;

describe("createVertexPartDefinition", () => {
	const vertex = createVertexPartDefinition<PolylineState>(2);

	it("names a vertex by its decimal index, and nothing past the last one", () => {
		expect(vertex.has(polyline, "0")).toBe(true);
		expect(vertex.has(polyline, "2")).toBe(true);
		expect(vertex.has(polyline, "3")).toBe(false);
	});

	it("refuses every spelling but the canonical one, which Number() alone would read as an index", () => {
		for (const id of ["", " 1 ", "+1", "1e0", "0x1", "-0", "01", "1.0"]) {
			expect(vertex.has(polyline, id), JSON.stringify(id)).toBe(false);
		}
	});

	it("removes the named vertices and keeps the rest in order", () => {
		expect(vertex.delete?.(polyline, ["1"])?.points).toEqual([
			{ x: 0, y: 0 },
			{ x: 20, y: 0 },
		]);
	});

	it("refuses a deletion that would leave fewer vertices than the floor", () => {
		expect(vertex.delete?.(polyline, ["0", "1"])).toBeNull();
	});
});
