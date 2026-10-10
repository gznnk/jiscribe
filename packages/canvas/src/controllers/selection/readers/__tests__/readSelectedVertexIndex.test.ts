import { describe, expect, it } from "vitest";

import { selectionOf } from "../../__tests__/support/selectionOf";
import { vertexPartSelection } from "../../__tests__/support/vertexPartSelection";
import { TEXT_SLOT_PART_KIND } from "../../partKinds/textSlotPartKind";
import { readSelectedVertexIndex } from "../readSelectedVertexIndex";

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
