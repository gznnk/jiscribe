import { describe, expect, it } from "vitest";

import { readSelectedVertexIndex } from "../readSelectedVertexIndex";
import { TEXT_SLOT_PART_KIND } from "../textSlotPartKind";
import { selectionOf } from "./support/selectionOf";
import { vertexPartSelection } from "./support/vertexPartSelection";

describe("readSelectedVertexIndex", () => {
	it("reads the picked vertex of the object asked about", () => {
		expect(
			readSelectedVertexIndex(
				selectionOf(["p1"], vertexPartSelection(3)),
				"p1",
			),
		).toBe(3);
	});

	it("names none while nothing is picked", () => {
		expect(readSelectedVertexIndex(selectionOf(["p1"]), "p1")).toBeNull();
	});

	it("names none when the pick sits on another object", () => {
		expect(
			readSelectedVertexIndex(
				selectionOf(["p2"], vertexPartSelection(0)),
				"p1",
			),
		).toBeNull();
	});

	it("names none for a pick of another kind sharing the id spelling", () => {
		expect(
			readSelectedVertexIndex(
				selectionOf(["p1"], {
					kind: TEXT_SLOT_PART_KIND,
					ranges: [{ anchorId: "0", focusId: "0" }],
				}),
				"p1",
			),
		).toBeNull();
	});
});
