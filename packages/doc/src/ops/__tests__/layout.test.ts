import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import { DocOperationError } from "../errors";
import {
	docOps,
	emptyDoc,
	expectValid,
	readObject,
} from "./support/docFixtures";

describe("layoutObjects", () => {
	/** Three boxes scattered out of order, joined a → b → c with ends on arbitrary points. */
	const scatteredChain = (): CanvasDoc => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 500, y: 300, width: 160, height: 80 });
		docOps.addObject(doc, "rect", { x: 40, y: 20, width: 160, height: 80 });
		docOps.addObject(doc, "rect", { x: 300, y: 500, width: 160, height: 80 });
		docOps.connect(doc, {
			sourceId: "rect-1",
			targetId: "rect-2",
			sourceAnchor: "leftCenter",
			targetAnchor: "rightCenter",
			points: [{ x: 1, y: 1 }],
		});
		docOps.connect(doc, { sourceId: "rect-2", targetId: "rect-3" });
		return doc;
	};

	it("stacks a chain in flow order, keeping the drawing's top-left corner", () => {
		const doc = scatteredChain();

		const result = docOps.layoutObjects(doc, undefined, { rankSpacing: 60 });

		expect(result).toEqual({
			nodeIds: ["rect-1", "rect-2", "rect-3"],
			connectorIds: ["connector-1", "connector-2"],
		});
		expect(readObject(doc, "rect-1")).toMatchObject({ x: 40, y: 20 });
		expect(readObject(doc, "rect-2")).toMatchObject({ x: 40, y: 160 });
		expect(readObject(doc, "rect-3")).toMatchObject({ x: 40, y: 300 });
		expectValid(doc);
	});

	it("re-anchors connectors to the facing sides and rewrites their routes", () => {
		const doc = scatteredChain();

		docOps.layoutObjects(doc, undefined);

		expect(readObject(doc, "connector-1")).toMatchObject({
			source: {
				owner: { id: "rect-1" },
				anchor: { kind: "edge", side: "bottom", t: 0.5 },
			},
			target: {
				owner: { id: "rect-2" },
				anchor: { kind: "edge", side: "top", t: 0.5 },
			},
			points: [],
		});
		expect(readObject(doc, "connector-1").routing).toBeUndefined();
	});

	it("lays out left to right when asked", () => {
		const doc = scatteredChain();

		docOps.layoutObjects(doc, ["rect-1", "rect-2", "rect-3"], {
			direction: "LR",
			rankSpacing: 100,
		});

		expect(readObject(doc, "rect-2")).toMatchObject({ x: 300, y: 20 });
		expect(readObject(doc, "connector-1")).toMatchObject({
			source: { anchor: { kind: "edge", side: "right" } },
			target: { anchor: { kind: "edge", side: "left" } },
		});
	});

	it("leaves objects outside the given ids, and connectors to them, alone", () => {
		const doc = scatteredChain();
		docOps.addObject(doc, "rect", { x: 900, y: 900, width: 50, height: 50 });
		docOps.connect(doc, { sourceId: "rect-3", targetId: "rect-4" });

		const result = docOps.layoutObjects(doc, ["rect-1", "rect-2"]);

		expect(result.connectorIds).toEqual(["connector-1"]);
		expect(readObject(doc, "rect-4")).toMatchObject({ x: 900, y: 900 });
		expect(readObject(doc, "connector-3")).toMatchObject({
			source: { anchor: { kind: "center" } },
		});
	});

	it("keeps room for a label and moves it onto the line there", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, width: 160, height: 80 });
		docOps.addObject(doc, "rect", { x: 0, y: 300, width: 160, height: 80 });
		docOps.connect(doc, {
			sourceId: "rect-1",
			targetId: "rect-2",
			label: "yes",
			labelPosition: 0.9,
			labelOffset: 20,
		});

		docOps.layoutObjects(doc, undefined, { rankSpacing: 60 });

		// The gap holds the label's box as well as the rank spacing.
		expect(readObject(doc, "rect-2").y as number).toBeGreaterThan(140);
		expect(readObject(doc, "connector-1")).toMatchObject({
			label: { text: "yes", position: 0.5, offset: 0 },
		});
	});

	it("needs two placeable objects and names a missing id", () => {
		const doc = scatteredChain();

		expect(() => docOps.layoutObjects(doc, ["rect-1"])).toThrow(
			new DocOperationError("layout needs at least 2 objects to place, got 1"),
		);
		expect(() => docOps.layoutObjects(doc, ["rect-1", "ghost"])).toThrow(
			DocOperationError,
		);
		expect(readObject(doc, "rect-1")).toMatchObject({ x: 500, y: 300 });
	});
});
