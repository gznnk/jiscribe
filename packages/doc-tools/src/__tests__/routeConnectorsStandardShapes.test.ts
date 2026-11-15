import type { CanvasDoc } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { standardDocOps } from "../canvasTools";
import { validateDoc } from "../validateDoc";

// routeConnectors on the shipped shapes, which no plugin's e2e suite runs: the lines
// ending on the container and AWS group types, and the ones on the connect points the
// ER entity and the group markers declare.

/** Parse a document written out here, failing the test when it does not parse. */
const parseDoc = (source: object): CanvasDoc => {
	const result = validateDoc(JSON.stringify(source));
	if (result.doc === undefined) {
		throw new Error(
			result.diagnostics.map((diagnostic) => diagnostic.message).join("; "),
		);
	}
	return result.doc;
};

const findObject = (doc: CanvasDoc, id: string): Record<string, unknown> =>
	doc.root.find((object) => object.id === id) as Record<string, unknown>;

describe("routeConnectors on the shipped container shapes", () => {
	it.each([
		["a container", { type: "container", title: "Orders", fields: {} }],
		[
			"an AWS group",
			{ type: "awsGroup", title: "VPC", fields: { kind: "vpc" } },
		],
	])(
		"routes a line from %s to a shape outside it, the frame's end on its side",
		(_, frame) => {
			const doc: CanvasDoc = { version: 1, root: [] };
			const frameId = standardDocOps.addObject(doc, frame.type, {
				x: 0,
				y: 0,
				width: 600,
				height: 300,
				text: frame.title,
				extraProps: frame.fields,
			});
			standardDocOps.addObject(doc, "rect", {
				x: 800,
				y: 130,
				width: 60,
				height: 40,
			});
			const connectorId = standardDocOps.connect(doc, {
				sourceId: frameId,
				targetId: "rect-1",
			});
			const parsed = parseDoc(doc);

			const result = standardDocOps.routeConnectors(parsed, undefined);

			expect(result.connectorIds).toEqual([connectorId]);
			expect(result.keptConnectorIdsByReason).toEqual({});
			expect(findObject(parsed, connectorId)).toMatchObject({
				source: {
					owner: { id: frameId },
					anchor: { kind: "edge", side: "right", t: 0.5 },
				},
				target: { anchor: { kind: "edge", side: "left", t: 0.5 } },
				points: [],
			});
		},
	);
});

describe("routeConnectors on the connect points the shipped shapes declare", () => {
	it.each([
		[
			"a brace's tip",
			{
				id: "brace",
				type: "brace",
				x: 0,
				y: 0,
				width: 24,
				height: 160,
				direction: "left",
			},
			"tip",
		],
		[
			"an ER entity's column",
			{
				id: "orders",
				type: "erEntity",
				x: 0,
				y: 0,
				name: "orders",
				columns: [{ key: "PK", name: "id", type: "bigint" }],
			},
			"col:0:left",
		],
	])("leaves a line to %s as it is", (_, shape, connectPointId) => {
		const doc = parseDoc({
			version: 1,
			root: [
				shape,
				{ id: "box", type: "rect", x: -300, y: -200, width: 60, height: 40 },
				{
					id: "line",
					type: "connector",
					source: {
						owner: { id: "box" },
						anchor: { kind: "edge", side: "bottom", t: 0.5 },
					},
					target: {
						owner: { id: shape.id },
						anchor: { kind: "connectPoint", id: connectPointId },
					},
					points: [],
				},
			],
		});
		const before = structuredClone(findObject(doc, "line"));

		const result = standardDocOps.routeConnectors(doc, undefined);

		expect(result.connectorIds).toEqual([]);
		expect(result.keptConnectorIdsByReason).toEqual({
			declaredConnectPoint: ["line"],
		});
		expect(findObject(doc, "line")).toEqual(before);
	});
});
