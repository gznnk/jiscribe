import { bench, describe } from "vitest";

import { createDocOps } from "../createDocOps";
import {
	buildConnectedDoc,
	buildConnectManyEntries,
} from "./support/buildConnectedDoc";
import type { EndpointRef } from "../../model/objects/types/EndpointRef";
import type { UpdateConnectorEntry } from "../connectors";
import type { AddObjectEntry } from "../create";

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

// Every end is looked up before any connector is pushed.
describe("connectMany: every connector at once", () => {
	for (const shapeCount of SIZES) {
		const { doc, shapeIds } = buildConnectedDoc({
			shapeCount,
			connectorCount: 0,
		});
		const entries = buildConnectManyEntries(shapeIds, shapeCount);
		const rootLength = doc.root.length;
		bench(`${shapeCount} shapes, ${shapeCount} connectors`, () => {
			docOps.connectMany(doc, entries);
			// Drop what was pushed, so every run starts from the same document.
			doc.root.length = rootLength;
		});
	}
});

// Every connector and every end it is moved to is looked up before any is written.
describe("updateConnectors: every connector re-attached at once", () => {
	for (const { shapeCount, doc } of docsBySize) {
		const connectors = doc.root.filter(
			(object) => object.type === "connector",
		) as unknown as {
			id: string;
			source: EndpointRef;
			target: EndpointRef;
		}[];
		const asBuilt: UpdateConnectorEntry[] = connectors.map(
			({ id, source, target }) => ({
				id,
				sourceId: source.owner?.id,
				targetId: target.owner?.id,
			}),
		);
		const reversed: UpdateConnectorEntry[] = asBuilt.map(
			({ id, sourceId, targetId }) => ({
				id,
				sourceId: targetId,
				targetId: sourceId,
			}),
		);
		let entries = reversed;
		bench(`${shapeCount} shapes, ${shapeCount} connectors`, () => {
			// Reversed and back, so the document stays where it was built.
			docOps.updateConnectors(doc, entries);
			entries = entries === reversed ? asBuilt : reversed;
		});
	}
});

// Every id is allocated against what the document and the batch already hold.
describe("addObjects: every shape at once", () => {
	for (const { shapeCount, doc } of docsBySize) {
		const entries: AddObjectEntry[] = Array.from(
			{ length: shapeCount },
			(_, index) => ({
				type: ["rect", "ellipse", "text"][index % 3],
				x: index * 10,
				y: -200,
			}),
		);
		const rootLength = doc.root.length;
		bench(`${shapeCount} shapes, ${shapeCount} connectors`, () => {
			docOps.addObjects(doc, entries);
			// Drop what was pushed, so every run starts from the same document.
			doc.root.length = rootLength;
		});
	}
});
