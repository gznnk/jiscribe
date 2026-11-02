import { bench, describe } from "vitest";

import { createDocOps } from "../createDocOps";
import { buildConnectedDoc } from "./support/buildConnectedDoc";

const docOps = createDocOps();

const SIZES = [100, 1000, 5000];

const docsBySize = SIZES.map((shapeCount) => ({
	shapeCount,
	...buildConnectedDoc({ shapeCount, connectorCount: shapeCount }),
}));

// What an AI reads instead of the whole document: one summary per object.
describe("listObjects: the whole document", () => {
	for (const { shapeCount, doc } of docsBySize) {
		bench(`${shapeCount} shapes, ${shapeCount} connectors`, () => {
			docOps.listObjects(doc);
		});
	}
});

// Every id is located in the tree before anything moves.
describe("translateObjects: every shape at once", () => {
	for (const { shapeCount, doc, shapeIds } of docsBySize) {
		let direction = 1;
		bench(`${shapeCount} shapes, ${shapeCount} connectors`, () => {
			// Back and forth, so the document stays where it was built.
			docOps.translateObjects(doc, shapeIds, direction, direction);
			direction = -direction;
		});
	}
});

// Every connector in the document is checked for an end on the shape.
describe("getConnectors: one shape", () => {
	for (const { shapeCount, doc, shapeIds } of docsBySize) {
		const lastShapeId = shapeIds[shapeIds.length - 1];
		bench(`${shapeCount} shapes, ${shapeCount} connectors`, () => {
			docOps.getConnectors(doc, lastShapeId);
		});
	}
});
