import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import { createTestRegistries } from "../../../../../registries/createCanvasRegistries";
import type { TextVerticalBasisSelection } from "../../../../../utils/textVerticalBasisSelection";
import { readSelectionTextVerticalBasis } from "../readSelectionTextVerticalBasis";

const registries = createTestRegistries();

const shapeOf = (
	id: string,
	type: string,
	textVerticalBasis?: "frame",
): ObjectState =>
	({
		id,
		type,
		...(textVerticalBasis ? { textVerticalBasis } : {}),
	}) as unknown as ObjectState;

const selectionOf = (
	...objects: ObjectState[]
): TextVerticalBasisSelection => ({
	objects: Object.fromEntries(objects.map((object) => [object.id, object])),
	selectedIds: objects.map((object) => object.id),
	selectedConnectorId: null,
});

const readBasis = (selection: TextVerticalBasisSelection) =>
	readSelectionTextVerticalBasis(selection, registries.objectTextVerticalBasis);

describe("readSelectionTextVerticalBasis", () => {
	it("nothing switchable in the selection → none", () => {
		expect(readBasis(selectionOf(shapeOf("r1", "rect")))).toEqual({
			kind: "none",
		});
	});

	it("an absent field reads as the region basis", () => {
		expect(readBasis(selectionOf(shapeOf("e1", "ellipse")))).toEqual({
			kind: "single",
			value: "region",
		});
	});

	it("a switched ellipse reads as the frame basis", () => {
		expect(readBasis(selectionOf(shapeOf("e1", "ellipse", "frame")))).toEqual({
			kind: "single",
			value: "frame",
		});
	});

	it("ellipses disagreeing on the basis → mixed", () => {
		const selection = selectionOf(
			shapeOf("e1", "ellipse", "frame"),
			shapeOf("e2", "ellipse"),
		);
		expect(readBasis(selection)).toEqual({ kind: "mixed" });
	});

	it("a rect mixed into the selection has no say", () => {
		const selection = selectionOf(
			shapeOf("e1", "ellipse"),
			shapeOf("r1", "rect"),
		);
		expect(readBasis(selection)).toEqual({ kind: "single", value: "region" });
	});
});
