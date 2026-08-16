import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import { DocOperationError } from "../errors";
import {
	docOps,
	emptyDoc,
	readObject,
} from "./support/docFixtures";

describe("alignObjects / distributeObjects", () => {
	const threeRects = (): CanvasDoc => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, width: 100, height: 100 });
		docOps.addObject(doc, "rect", { x: 130, y: 40, width: 100, height: 60 });
		docOps.addObject(doc, "rect", { x: 400, y: 10, width: 100, height: 100 });
		return doc;
	};

	it("lines objects up on one edge without touching the other axis", () => {
		const doc = threeRects();

		docOps.alignObjects(doc, ["rect-1", "rect-2", "rect-3"], "top");

		expect(readObject(doc, "rect-2")).toMatchObject({ x: 130, y: 0 });
		expect(readObject(doc, "rect-3")).toMatchObject({ x: 400, y: 0 });
	});

	it("centers objects on the selection's own midline", () => {
		const doc = threeRects();

		docOps.alignObjects(doc, ["rect-1", "rect-3"], "centerY");

		// The union spans y 0..110, so both centres land on 55.
		expect(readObject(doc, "rect-1")).toMatchObject({ y: 5 });
		expect(readObject(doc, "rect-3")).toMatchObject({ y: 5 });
	});

	it("spreads objects evenly between the outermost two", () => {
		const doc = threeRects();

		docOps.distributeObjects(doc, ["rect-1", "rect-2", "rect-3"], "horizontal");

		// 0..500 span, 300px of shapes, so each of the two gaps is 100.
		expect(readObject(doc, "rect-2")).toMatchObject({ x: 200 });
		expect(readObject(doc, "rect-3")).toMatchObject({ x: 400 });
	});

	it("uses a fixed gap when one is given, keeping the first object in place", () => {
		const doc = threeRects();

		docOps.distributeObjects(
			doc,
			["rect-1", "rect-2", "rect-3"],
			"horizontal",
			20,
		);

		expect(readObject(doc, "rect-2")).toMatchObject({ x: 120 });
		expect(readObject(doc, "rect-3")).toMatchObject({ x: 240 });
	});

	it("needs three objects to spread without a gap, and two with one", () => {
		const doc = threeRects();

		expect(() =>
			docOps.distributeObjects(doc, ["rect-1", "rect-2"], "horizontal"),
		).toThrow(DocOperationError);
		expect(() =>
			docOps.distributeObjects(doc, ["rect-1", "rect-2"], "horizontal", 40),
		).not.toThrow();
	});
});
