import { describe, expect, it } from "vitest";

import { readSelectedVertexIndex } from "../readSelectedVertexIndex";
import { TEXT_SLOT_PART_KIND } from "../textSlotPartKind";
import { vertexPartSelection } from "./support/vertexPartSelection";

describe("readSelectedVertexIndex", () => {
	it("reads the picked vertex of the object asked about", () => {
		expect(readSelectedVertexIndex(vertexPartSelection("p1", 3), "p1")).toBe(3);
	});

	it("names none while nothing is picked", () => {
		expect(readSelectedVertexIndex(null, "p1")).toBeNull();
	});

	it("names none when the pick sits on another object", () => {
		expect(
			readSelectedVertexIndex(vertexPartSelection("p2", 0), "p1"),
		).toBeNull();
	});

	it("names none for a pick of another kind sharing the id spelling", () => {
		expect(
			readSelectedVertexIndex(
				{
					objectId: "p1",
					kind: TEXT_SLOT_PART_KIND,
					ranges: [{ anchorId: "0", focusId: "0" }],
				},
				"p1",
			),
		).toBeNull();
	});
});
