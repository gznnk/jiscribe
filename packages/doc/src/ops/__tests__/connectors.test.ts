import { describe, expect, it } from "vitest";

import {
	docOps,
	emptyDoc,
	expectValid,
	readObject,
	rootIds,
	twoConnectedRects,
	twoRects,
} from "./support/docFixtures";
import { columnCardDefinition } from "./support/pluginFixtures";
import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../../model/objects/base/ObjectDoc";
import type { EdgeAnchorSide } from "../../model/objects/types/EndpointRef";
import { createDocOps } from "../createDocOps";
import { DocOperationError } from "../errors";

/** Doc-ops that also know {@link columnCardDefinition}, the type declaring `col:<i>:*` points. */
const columnOps = createDocOps({
	plugins: [
		{ id: "column-plugin", objects: { "column-card": columnCardDefinition } },
	],
});

describe("connect", () => {
	it("connects two top-level objects into a valid document", () => {
		const doc = emptyDoc();
		const source = docOps.addObject(doc, "rect", { x: 0, y: 0 });
		const target = docOps.addObject(doc, "ellipse", {
			x: 320,
			y: -50,
			width: 160,
			height: 100,
		});

		const id = docOps.connect(doc, {
			sourceId: source,
			targetId: target,
			endArrow: "FilledTriangle",
		});

		expect(id).toBe("connector-1");
		expectValid(doc);
	});

	it("defaults to straight routing for the center-to-center default (no anchors)", () => {
		const doc = emptyDoc();
		const source = docOps.addObject(doc, "rect", { x: 0, y: 0 });
		const target = docOps.addObject(doc, "rect", { x: 400, y: 0 });

		docOps.connect(doc, { sourceId: source, targetId: target });

		const connector = doc.root[2] as Record<string, unknown>;
		expect(connector.source).toMatchObject({ anchor: { kind: "center" } });
		expect(connector.target).toMatchObject({ anchor: { kind: "center" } });
		expect(connector.routing).toBe("straight");
		expectValid(doc);
	});

	it("stores an edge midpoint id as a connectPoint anchor", () => {
		const doc = emptyDoc();
		const source = docOps.addObject(doc, "rect", { x: 0, y: 0 });
		const target = docOps.addObject(doc, "rect", { x: 400, y: 0 });

		docOps.connect(doc, {
			sourceId: source,
			targetId: target,
			sourceAnchor: "bottomCenter",
			targetAnchor: "leftCenter",
		});

		const connector = doc.root[2] as Record<string, unknown>;
		expect(connector.source).toMatchObject({
			anchor: { kind: "connectPoint", id: "bottomCenter" },
		});
		expect(connector.target).toMatchObject({
			anchor: { kind: "connectPoint", id: "leftCenter" },
		});
		expectValid(doc);
	});

	it("stores an edge handle as an edge anchor and keeps routing omitted", () => {
		const doc = emptyDoc();
		const source = docOps.addObject(doc, "rect", { x: 0, y: 0 });
		const target = docOps.addObject(doc, "rect", { x: 400, y: 0 });

		docOps.connect(doc, {
			sourceId: source,
			targetId: target,
			sourceAnchor: { side: "bottom", t: 0.25 },
			targetAnchor: { side: "left", t: 0 },
		});

		const connector = doc.root[2] as Record<string, unknown>;
		expect(connector.source).toMatchObject({
			anchor: { kind: "edge", side: "bottom", t: 0.25 },
		});
		expect(connector.target).toMatchObject({
			anchor: { kind: "edge", side: "left", t: 0 },
		});
		// An edge anchor carries an exit direction, so the orthogonal default stands.
		expect(connector.routing).toBeUndefined();
		expectValid(doc);
	});

	it.each([-0.01, 1.4, Number.NaN, Number.POSITIVE_INFINITY])(
		"throws DocOperationError and leaves the doc untouched for the edge handle t %p",
		(t) => {
			const doc = emptyDoc();
			const source = docOps.addObject(doc, "rect", { x: 0, y: 0 });
			const target = docOps.addObject(doc, "rect", { x: 400, y: 0 });
			const before = JSON.stringify(doc);

			expect(() =>
				docOps.connect(doc, {
					sourceId: source,
					targetId: target,
					sourceAnchor: { side: "bottom", t },
				}),
			).toThrow(DocOperationError);
			expect(JSON.stringify(doc)).toBe(before);
		},
	);

	it("throws DocOperationError for an edge handle side that is not an edge", () => {
		const doc = emptyDoc();
		const source = docOps.addObject(doc, "rect", { x: 0, y: 0 });
		const target = docOps.addObject(doc, "rect", { x: 400, y: 0 });
		const before = JSON.stringify(doc);

		expect(() =>
			docOps.connect(doc, {
				sourceId: source,
				targetId: target,
				// The doc model has no such side; only top / right / bottom / left exist.
				sourceAnchor: { side: "middle" as EdgeAnchorSide, t: 0.5 },
			}),
		).toThrow(DocOperationError);
		expect(JSON.stringify(doc)).toBe(before);
	});

	it("omits routing (orthogonal default) when both ends pin to an edge midpoint", () => {
		const doc = emptyDoc();
		const source = docOps.addObject(doc, "rect", { x: 0, y: 0 });
		const target = docOps.addObject(doc, "rect", { x: 400, y: 0 });

		docOps.connect(doc, {
			sourceId: source,
			targetId: target,
			sourceAnchor: "rightCenter",
			targetAnchor: "leftCenter",
		});

		const connector = doc.root[2] as Record<string, unknown>;
		expect(connector.routing).toBeUndefined();
		expectValid(doc);
	});

	// #115: id uniqueness recurses into group children, so target search must too —
	// otherwise connecting to an object inside a group fails asymmetrically.
	it("connects to an object nested inside a group", () => {
		const doc = {
			version: 1 as const,
			root: [
				{
					id: "g-1",
					type: "group",
					children: [
						{
							id: "inner-rect",
							type: "rect",
							x: 300,
							y: 300,
							width: 120,
							height: 60,
							fill: "transparent",
							stroke: "auto",
							strokeWidth: 2,
							rx: 0,
							text: "",
							textAlign: "center",
							verticalAlign: "middle",
							fontColor: "auto",
							fontSize: 16,
							fontFamily: "Noto Sans JP",
							fontWeight: "normal",
						},
					],
				},
			],
		};
		const source = docOps.addObject(doc, "rect", { x: 0, y: 0 });

		expect(() =>
			docOps.connect(doc, { sourceId: source, targetId: "inner-rect" }),
		).not.toThrow();
		expectValid(doc);
	});

	it("throws DocOperationError for a missing id", () => {
		const doc = emptyDoc();
		const source = docOps.addObject(doc, "rect", { x: 0, y: 0 });

		expect(() =>
			docOps.connect(doc, { sourceId: source, targetId: "missing" }),
		).toThrow(DocOperationError);
	});

	it("throws DocOperationError when the target is not connectable", () => {
		const doc = emptyDoc();
		const first = docOps.addObject(doc, "rect", { x: 0, y: 0 });
		const second = docOps.addObject(doc, "rect", { x: 400, y: 0 });
		const connectorId = docOps.connect(doc, {
			sourceId: first,
			targetId: second,
		});

		// A connector itself is not a connectable type.
		expect(() =>
			docOps.connect(doc, { sourceId: first, targetId: connectorId }),
		).toThrow(DocOperationError);
	});
});

describe("connect with a free end", () => {
	/** Two default-sized rects at (0,0) and (400,0), ready to hang a connector off. */
	const defaultSizedRects = () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		docOps.addObject(doc, "rect", { x: 400, y: 0 });
		return doc;
	};

	it("stores a target point as a free endpoint carrying no owner", () => {
		const doc = defaultSizedRects();

		docOps.connect(doc, {
			sourceId: "rect-1",
			targetPoint: { x: 260, y: 180 },
		});

		const connector = doc.root[2] as Record<string, unknown>;
		expect(connector.target).toEqual({
			anchor: { kind: "free", point: { x: 260, y: 180 } },
		});
		expect(connector.target).not.toHaveProperty("owner");
		expectValid(doc);
	});

	it("stores a source point while the target stays attached", () => {
		const doc = defaultSizedRects();

		docOps.connect(doc, {
			sourcePoint: { x: -80, y: -40 },
			targetId: "rect-2",
			targetAnchor: "leftCenter",
		});

		const connector = doc.root[2] as Record<string, unknown>;
		expect(connector.source).toEqual({
			anchor: { kind: "free", point: { x: -80, y: -40 } },
		});
		expect(connector.target).toMatchObject({ owner: { id: "rect-2" } });
		expectValid(doc);
	});

	it("copies the point, so mutating the caller's object leaves the doc alone", () => {
		const doc = defaultSizedRects();
		const point = { x: 10, y: 20 };

		docOps.connect(doc, { sourceId: "rect-1", targetPoint: point });
		point.x = 999;

		const connector = doc.root[2] as Record<string, unknown>;
		expect(connector.target).toMatchObject({
			anchor: { point: { x: 10, y: 20 } },
		});
	});

	it("keeps the orthogonal default when the attached end has a direction", () => {
		const doc = defaultSizedRects();

		docOps.connect(doc, {
			sourceId: "rect-1",
			sourceAnchor: "rightCenter",
			targetPoint: { x: 260, y: 180 },
		});

		// defaultRoutingForAnchors only turns straight for a center, and a free end is not one.
		expect((doc.root[2] as Record<string, unknown>).routing).toBeUndefined();
	});

	it("turns straight when the attached end is a center", () => {
		const doc = defaultSizedRects();

		docOps.connect(doc, {
			sourceId: "rect-1",
			targetPoint: { x: 260, y: 180 },
		});

		expect((doc.root[2] as Record<string, unknown>).routing).toBe("straight");
	});

	it.each(["source", "target"] as const)(
		"throws DocOperationError when the %s end names both an object and a point",
		(end) => {
			const doc = defaultSizedRects();
			const before = JSON.stringify(doc);

			expect(() =>
				docOps.connect(doc, {
					sourceId: "rect-1",
					targetId: "rect-2",
					[`${end}Point`]: { x: 0, y: 0 },
				}),
			).toThrow(new RegExp(`${end} end got both ${end}Id and ${end}Point`));
			expect(JSON.stringify(doc)).toBe(before);
		},
	);

	it.each(["source", "target"] as const)(
		"throws DocOperationError when the %s end names neither an object nor a point",
		(end) => {
			const doc = defaultSizedRects();
			const otherEnd = end === "source" ? "target" : "source";

			expect(() =>
				docOps.connect(doc, { [`${otherEnd}Id`]: "rect-1" }),
			).toThrow(new RegExp(`${end} end got neither ${end}Id nor ${end}Point`));
		},
	);

	it("throws DocOperationError when a point is paired with an anchor", () => {
		const doc = defaultSizedRects();

		expect(() =>
			docOps.connect(doc, {
				sourceId: "rect-1",
				targetPoint: { x: 0, y: 0 },
				targetAnchor: "leftCenter",
			}),
		).toThrow(/anchor is a position on an object/);
	});

	it.each([
		{ x: Number.NaN, y: 0 },
		{ x: 0, y: Number.POSITIVE_INFINITY },
	])("throws DocOperationError for the non-finite point %p", (point) => {
		const doc = defaultSizedRects();
		const before = JSON.stringify(doc);

		expect(() =>
			docOps.connect(doc, { sourceId: "rect-1", targetPoint: point }),
		).toThrow(DocOperationError);
		expect(JSON.stringify(doc)).toBe(before);
	});

	// The doc model reserves a line owned by nothing for polyline (see validateConnectorDoc).
	it("throws DocOperationError when both ends are points", () => {
		const doc = defaultSizedRects();
		const before = JSON.stringify(doc);

		expect(() =>
			docOps.connect(doc, {
				sourcePoint: { x: 0, y: 0 },
				targetPoint: { x: 100, y: 100 },
			}),
		).toThrow(/at least one end attached to an object/);
		expect(JSON.stringify(doc)).toBe(before);
	});
});

describe("connectMany", () => {
	it("draws every connector in the order given and returns their ids positionally", () => {
		const doc = twoRects();
		docOps.addObject(doc, "rect", { x: 600, y: 0, width: 100, height: 100 });

		const ids = docOps.connectMany(doc, [
			{ sourceId: "rect-1", targetId: "rect-2", endArrow: "FilledTriangle" },
			{
				sourceId: "rect-2",
				targetId: "rect-3",
				sourceAnchor: "rightCenter",
				targetAnchor: "leftCenter",
			},
		]);

		expect(ids).toEqual(["connector-1", "connector-2"]);
		expect(rootIds(doc)).toEqual([
			"rect-1",
			"rect-2",
			"rect-3",
			"connector-1",
			"connector-2",
		]);
		expect(readObject(doc, "connector-1").endArrow).toBe("FilledTriangle");
		expect(readObject(doc, "connector-2").source).toMatchObject({
			anchor: { kind: "connectPoint", id: "rightCenter" },
		});
		expectValid(doc);
	});

	it("lets several entries name the same object", () => {
		const doc = twoRects();
		docOps.addObject(doc, "rect", { x: 600, y: 0, width: 100, height: 100 });

		expect(
			docOps.connectMany(doc, [
				{ sourceId: "rect-1", targetId: "rect-2" },
				{ sourceId: "rect-1", targetId: "rect-3" },
				{ sourceId: "rect-1", targetPoint: { x: 0, y: 400 } },
			]),
		).toEqual(["connector-1", "connector-2", "connector-3"]);
		expectValid(doc);
	});

	it("leaves the doc untouched when one entry is bad", () => {
		const doc = twoRects();
		const before = JSON.stringify(doc);

		expect(() =>
			docOps.connectMany(doc, [
				{ sourceId: "rect-1", targetId: "rect-2" },
				{ sourceId: "rect-1", targetId: "missing" },
			]),
		).toThrow(
			"entries[1]: object not found: missing — the document was left unchanged",
		);
		expect(JSON.stringify(doc)).toBe(before);
	});

	it("is a no-op returning no ids for an empty array", () => {
		const doc = twoRects();
		const before = JSON.stringify(doc);

		expect(docOps.connectMany(doc, [])).toEqual([]);
		expect(JSON.stringify(doc)).toBe(before);
	});

	it("matches connect for a single entry", () => {
		const singleDoc = twoRects();
		docOps.connect(singleDoc, {
			sourceId: "rect-1",
			targetId: "rect-2",
			label: "on failure",
			endArrow: "FilledTriangle",
		});

		const batchDoc = twoRects();
		docOps.connectMany(batchDoc, [
			{
				sourceId: "rect-1",
				targetId: "rect-2",
				label: "on failure",
				endArrow: "FilledTriangle",
			},
		]);

		expect(JSON.stringify(batchDoc)).toBe(JSON.stringify(singleDoc));
	});
});

describe("updateConnector", () => {
	it("re-attaches an end to another object", () => {
		const doc = twoConnectedRects();
		docOps.addObject(doc, "rect", { x: 600, y: 0 });

		docOps.updateConnector(doc, "connector-1", { targetId: "rect-3" });

		expect(readObject(doc, "connector-1").target).toEqual({
			owner: { id: "rect-3" },
			anchor: { kind: "center" },
		});
		expectValid(doc);
	});

	it("keeps the owner when only the anchor moves", () => {
		const doc = twoConnectedRects();

		docOps.updateConnector(doc, "connector-1", {
			sourceAnchor: "rightCenter",
			targetAnchor: "leftCenter",
		});

		expect(readObject(doc, "connector-1").source).toEqual({
			owner: { id: "rect-1" },
			anchor: { kind: "connectPoint", id: "rightCenter" },
		});
		expectValid(doc);
	});

	it("takes explicit waypoints as the route", () => {
		const doc = twoConnectedRects();

		docOps.updateConnector(doc, "connector-1", {
			routing: "orthogonal",
			points: [
				{ x: 150, y: 50 },
				{ x: 150, y: 200 },
				{ x: 350, y: 200 },
			],
		});

		expect(readObject(doc, "connector-1")).toMatchObject({
			routing: "orthogonal",
			points: [
				{ x: 150, y: 50 },
				{ x: 150, y: 200 },
				{ x: 350, y: 200 },
			],
		});
		expectValid(doc);

		docOps.updateConnector(doc, "connector-1", { points: [] });
		expect(readObject(doc, "connector-1").points).toEqual([]);
	});

	it("re-derives the routing only for a connector that never stored one", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		docOps.addObject(doc, "rect", { x: 400, y: 0 });
		// Two connectPoints leave routing off the doc entirely.
		docOps.connect(doc, {
			sourceId: "rect-1",
			targetId: "rect-2",
			sourceAnchor: "rightCenter",
			targetAnchor: "leftCenter",
		});

		docOps.updateConnector(doc, "connector-1", { targetAnchor: "center" });
		expect(readObject(doc, "connector-1").routing).toBe("straight");

		// Now that "straight" is stored, re-anchoring must not silently undo it.
		docOps.updateConnector(doc, "connector-1", { targetAnchor: "leftCenter" });
		expect(readObject(doc, "connector-1").routing).toBe("straight");
	});

	it("places the label, and refuses to place one that does not exist", () => {
		const doc = twoConnectedRects();

		expect(() =>
			docOps.updateConnector(doc, "connector-1", { labelPosition: 0.3 }),
		).toThrow(DocOperationError);

		docOps.setText(doc, "connector-1", "yes");
		docOps.updateConnector(doc, "connector-1", {
			labelPosition: 0.3,
			labelOffset: -12,
		});

		expect(readObject(doc, "connector-1").label).toMatchObject({
			position: 0.3,
			offset: -12,
		});
		expectValid(doc);
	});

	it("refuses an id that is not a connector", () => {
		const doc = twoConnectedRects();

		expect(() => docOps.updateConnector(doc, "rect-1", {})).toThrow(
			/not a connector/,
		);
	});
});

describe("updateConnector with a free end", () => {
	it("detaches an end onto a coordinate", () => {
		const doc = twoConnectedRects();

		docOps.updateConnector(doc, "connector-1", {
			targetPoint: { x: 260, y: 180 },
		});

		expect(readObject(doc, "connector-1").target).toEqual({
			anchor: { kind: "free", point: { x: 260, y: 180 } },
		});
		expectValid(doc);
	});

	it("moves an end that is already free", () => {
		const doc = twoConnectedRects();
		docOps.updateConnector(doc, "connector-1", {
			targetPoint: { x: 260, y: 180 },
		});

		docOps.updateConnector(doc, "connector-1", {
			targetPoint: { x: 300, y: 200 },
		});

		expect(readObject(doc, "connector-1").target).toEqual({
			anchor: { kind: "free", point: { x: 300, y: 200 } },
		});
		expectValid(doc);
	});

	// The free anchor holds a coordinate that means nothing once the end is owned again.
	it("re-attaches a free end and drops its coordinate", () => {
		const doc = twoConnectedRects();
		docOps.updateConnector(doc, "connector-1", {
			targetPoint: { x: 260, y: 180 },
		});

		docOps.updateConnector(doc, "connector-1", { targetId: "rect-2" });

		expect(readObject(doc, "connector-1").target).toEqual({
			owner: { id: "rect-2" },
			anchor: { kind: "center" },
		});
		expectValid(doc);
	});

	it("refuses an anchor on an end that is free", () => {
		const doc = twoConnectedRects();
		docOps.updateConnector(doc, "connector-1", {
			targetPoint: { x: 260, y: 180 },
		});

		expect(() =>
			docOps.updateConnector(doc, "connector-1", {
				targetAnchor: "leftCenter",
			}),
		).toThrow(/target end is not attached to an object/);
	});

	it("refuses to detach the only remaining attached end", () => {
		const doc = twoConnectedRects();
		docOps.updateConnector(doc, "connector-1", {
			targetPoint: { x: 260, y: 180 },
		});
		const before = JSON.stringify(doc);

		expect(() =>
			docOps.updateConnector(doc, "connector-1", {
				sourcePoint: { x: -50, y: -50 },
			}),
		).toThrow(/at least one end attached to an object/);
		expect(JSON.stringify(doc)).toBe(before);
	});

	it("refuses an end that names both an object and a point", () => {
		const doc = twoConnectedRects();

		expect(() =>
			docOps.updateConnector(doc, "connector-1", {
				targetId: "rect-2",
				targetPoint: { x: 0, y: 0 },
			}),
		).toThrow(DocOperationError);
	});
});

describe("updateConnectors", () => {
	/** Three rects wired up by two connectors. */
	const twoConnectors = (): CanvasDoc => {
		const doc = twoConnectedRects();
		docOps.addObject(doc, "rect", { x: 600, y: 0, width: 100, height: 100 });
		docOps.connect(doc, { sourceId: "rect-2", targetId: "rect-3" });
		return doc;
	};

	it("changes every connector named, each in its own way", () => {
		const doc = twoConnectors();

		docOps.updateConnectors(doc, [
			{
				id: "connector-1",
				sourceAnchor: "rightCenter",
				targetAnchor: "leftCenter",
			},
			{ id: "connector-2", endArrow: "None", targetPoint: { x: 800, y: 300 } },
		]);

		expect(readObject(doc, "connector-1").source).toEqual({
			owner: { id: "rect-1" },
			anchor: { kind: "connectPoint", id: "rightCenter" },
		});
		expect(readObject(doc, "connector-2").endArrow).toBe("None");
		expect(readObject(doc, "connector-2").target).toEqual({
			anchor: { kind: "free", point: { x: 800, y: 300 } },
		});
		expectValid(doc);
	});

	// Two entries for one connector would each be checked against the endpoints it had
	// before the call, so a pair detaching one end each would pass and leave it loose.
	it("refuses an id given more than once, naming it", () => {
		const doc = twoConnectors();
		const before = JSON.stringify(doc);

		expect(() =>
			docOps.updateConnectors(doc, [
				{ id: "connector-1", targetPoint: { x: 0, y: 0 } },
				{ id: "connector-1", sourcePoint: { x: 10, y: 10 } },
			]),
		).toThrow(
			"connector-1: given more than once; put every change to one connector in a single entry",
		);
		expect(JSON.stringify(doc)).toBe(before);
	});

	it("leaves the doc untouched when a later entry is not a connector", () => {
		const doc = twoConnectors();
		const before = JSON.stringify(doc);

		expect(() =>
			docOps.updateConnectors(doc, [
				{ id: "connector-1", sourceAnchor: "rightCenter" },
				{ id: "rect-1", sourceAnchor: "rightCenter" },
			]),
		).toThrow(
			'entries[1] (rect-1): rect-1 is "rect", not a connector — the document was left unchanged',
		);
		expect(JSON.stringify(doc)).toBe(before);
	});

	it("is a no-op for an empty array", () => {
		const doc = twoConnectors();
		const before = JSON.stringify(doc);

		docOps.updateConnectors(doc, []);

		expect(JSON.stringify(doc)).toBe(before);
	});

	it("matches updateConnector for a single entry", () => {
		const singleDoc = twoConnectors();
		docOps.updateConnector(singleDoc, "connector-1", {
			targetId: "rect-3",
			targetAnchor: "leftCenter",
			endArrow: "FilledTriangle",
		});

		const batchDoc = twoConnectors();
		docOps.updateConnectors(batchDoc, [
			{
				id: "connector-1",
				targetId: "rect-3",
				targetAnchor: "leftCenter",
				endArrow: "FilledTriangle",
			},
		]);

		expect(JSON.stringify(batchDoc)).toBe(JSON.stringify(singleDoc));
	});
});

describe("getConnectors / getConnectedObjects", () => {
	/** {@link twoConnectedRects} plus `rect-3`, which nothing reaches. */
	const wiredRects = (): CanvasDoc => {
		const doc = twoConnectedRects();
		docOps.addObject(doc, "rect", { x: 600, y: 0, width: 100, height: 100 });
		return doc;
	};

	it("finds the connector from either of its ends", () => {
		const doc = wiredRects();

		expect(docOps.getConnectors(doc, "rect-1")).toEqual(["connector-1"]);
		expect(docOps.getConnectors(doc, "rect-2")).toEqual(["connector-1"]);
		expect(docOps.getConnectedObjects(doc, "rect-1")).toEqual(["rect-2"]);
		expect(docOps.getConnectedObjects(doc, "rect-2")).toEqual(["rect-1"]);
	});

	it("hands back an id getObject resolves to the doc's own connector", () => {
		const doc = wiredRects();

		expect(docOps.getObject(doc, docOps.getConnectors(doc, "rect-1")[0])).toBe(
			readObject(doc, "connector-1"),
		);
	});

	it("lists several connectors in drawing order, whichever end they meet on", () => {
		const doc = wiredRects();
		docOps.connect(doc, { sourceId: "rect-3", targetId: "rect-2" });
		docOps.connect(doc, { sourceId: "rect-2", targetId: "rect-3" });

		expect(docOps.getConnectors(doc, "rect-2")).toEqual([
			"connector-1",
			"connector-2",
			"connector-3",
		]);
	});

	it("folds a neighbour reached by more than one connector into one id", () => {
		const doc = wiredRects();
		docOps.connect(doc, { sourceId: "rect-2", targetId: "rect-1" });

		expect(docOps.getConnectors(doc, "rect-1")).toHaveLength(2);
		expect(docOps.getConnectedObjects(doc, "rect-1")).toEqual(["rect-2"]);
	});

	it("is empty for an object nothing is attached to", () => {
		const doc = wiredRects();

		expect(docOps.getConnectors(doc, "rect-3")).toEqual([]);
		expect(docOps.getConnectedObjects(doc, "rect-3")).toEqual([]);
	});

	it("is empty for a connector, which is never an endpoint owner", () => {
		const doc = wiredRects();

		expect(docOps.getConnectors(doc, "connector-1")).toEqual([]);
		expect(docOps.getConnectedObjects(doc, "connector-1")).toEqual([]);
	});

	it("keeps a connector whose far end is free, and reports no neighbour for it", () => {
		const doc = wiredRects();
		docOps.connect(doc, {
			sourceId: "rect-3",
			targetPoint: { x: 900, y: 400 },
		});

		expect(docOps.getConnectors(doc, "rect-3")).toEqual(["connector-2"]);
		expect(docOps.getConnectedObjects(doc, "rect-3")).toEqual([]);
	});

	it("lists a self-loop once and leaves the object out of its own neighbours", () => {
		const doc = wiredRects();
		docOps.connect(doc, {
			sourceId: "rect-3",
			targetId: "rect-3",
			sourceAnchor: "topCenter",
			targetAnchor: "bottomCenter",
		});

		expect(docOps.getConnectors(doc, "rect-3")).toEqual(["connector-2"]);
		expect(docOps.getConnectedObjects(doc, "rect-3")).toEqual([]);
		expectValid(doc);
	});

	it("finds the connectors on an object that has since been grouped", () => {
		const doc = wiredRects();
		docOps.groupObjects(doc, ["rect-1", "rect-3"]);

		expect(docOps.getConnectors(doc, "rect-1")).toEqual(["connector-1"]);
		expect(docOps.getConnectedObjects(doc, "rect-1")).toEqual(["rect-2"]);
	});

	it("throws for an id that is not in the doc", () => {
		const doc = wiredRects();

		expect(() => docOps.getConnectors(doc, "missing")).toThrow(
			DocOperationError,
		);
		expect(() => docOps.getConnectedObjects(doc, "missing")).toThrow(
			"object not found: missing",
		);
	});
});

describe("connect points the owner offers", () => {
	/** A four-column card `column-card-1` at the origin and `rect-1` to its right. */
	const cardAndRect = (): CanvasDoc => {
		const doc = emptyDoc();
		columnOps.addObject(doc, "column-card", { x: 0, y: 0 });
		columnOps.addObject(doc, "rect", { x: 300, y: 0 });
		return doc;
	};
	const sourceAnchorOf = (doc: CanvasDoc, id: string) =>
		(readObject(doc, id).source as { anchor: unknown }).anchor;

	it("stores a connect point the owner's type declares", () => {
		const doc = cardAndRect();

		const id = columnOps.connect(doc, {
			sourceId: "column-card-1",
			targetId: "rect-1",
			sourceAnchor: "col:3:right",
		});

		expect(sourceAnchorOf(doc, id)).toEqual({
			kind: "connectPoint",
			id: "col:3:right",
		});
	});

	it("still takes the edge midpoints on a type declaring points of its own", () => {
		const doc = cardAndRect();

		const id = columnOps.connect(doc, {
			sourceId: "column-card-1",
			targetId: "rect-1",
			sourceAnchor: "rightCenter",
			targetAnchor: "leftCenter",
		});

		expect(sourceAnchorOf(doc, id)).toEqual({
			kind: "connectPoint",
			id: "rightCenter",
		});
	});

	it("refuses an id the owner does not declare, listing what it offers", () => {
		const doc = cardAndRect();
		const before = structuredClone(doc);

		expect(() =>
			columnOps.connect(doc, {
				sourceId: "column-card-1",
				targetId: "rect-1",
				sourceAnchor: "col:4:left",
			}),
		).toThrow(
			new DocOperationError(
				'"col:4:left" is not a connect point of "column-card-1" (column-card); it offers topCenter, rightCenter, bottomCenter, leftCenter and the 8 its type declares: col:0:left, col:0:right, …, col:3:left, col:3:right',
			),
		);
		expect(doc).toEqual(before);
	});

	it("lists every declared id when there are few, read off the doc as it stands", () => {
		const doc = cardAndRect();
		(doc.root[0] as Record<string, unknown>).columns = 2;

		expect(() =>
			columnOps.connect(doc, {
				sourceId: "column-card-1",
				targetId: "rect-1",
				sourceAnchor: "col:3:left",
			}),
		).toThrow(
			"it offers topCenter, rightCenter, bottomCenter, leftCenter and the 4 its type declares: col:0:left, col:0:right, col:1:left, col:1:right",
		);
	});

	it("refuses anything but the edge midpoints on a type declaring none", () => {
		const doc = cardAndRect();

		expect(() =>
			columnOps.connect(doc, {
				sourceId: "column-card-1",
				targetId: "rect-1",
				targetAnchor: "col:0:left",
			}),
		).toThrow(
			new DocOperationError(
				'"col:0:left" is not a connect point of "rect-1" (rect); it offers topCenter, rightCenter, bottomCenter, leftCenter',
			),
		);
	});

	it("names the entry at fault in connectMany", () => {
		const doc = cardAndRect();

		expect(() =>
			columnOps.connectMany(doc, [
				{ sourceId: "column-card-1", targetId: "rect-1" },
				{
					sourceId: "column-card-1",
					targetId: "rect-1",
					sourceAnchor: "col:9:right",
				},
			]),
		).toThrow(
			/^entries\[1\].*"col:9:right" is not a connect point of "column-card-1"/,
		);
		expect(rootIds(doc)).toEqual(["column-card-1", "rect-1"]);
	});

	it("refuses re-anchoring onto an undeclared id in updateConnector and updateConnectors", () => {
		const doc = cardAndRect();
		columnOps.connect(doc, { sourceId: "column-card-1", targetId: "rect-1" });
		const before = structuredClone(doc);

		expect(() =>
			columnOps.updateConnector(doc, "connector-1", {
				sourceAnchor: "col:7:left",
			}),
		).toThrow('"col:7:left" is not a connect point of "column-card-1"');
		expect(() =>
			columnOps.updateConnectors(doc, [
				{ id: "connector-1", sourceAnchor: "col:7:left" },
			]),
		).toThrow('"col:7:left" is not a connect point of "column-card-1"');
		expect(doc).toEqual(before);

		columnOps.updateConnector(doc, "connector-1", {
			sourceAnchor: "col:0:left",
		});
		expect(sourceAnchorOf(doc, "connector-1")).toEqual({
			kind: "connectPoint",
			id: "col:0:left",
		});
	});

	it("refuses moving an end to an owner that does not offer the connect point it keeps", () => {
		const doc = cardAndRect();
		columnOps.addObject(doc, "rect", { x: 600, y: 0 });
		columnOps.connect(doc, {
			sourceId: "column-card-1",
			targetId: "rect-1",
			sourceAnchor: "col:1:right",
		});

		expect(() =>
			columnOps.updateConnector(doc, "connector-1", { sourceId: "rect-2" }),
		).toThrow('"col:1:right" is not a connect point of "rect-2" (rect)');
	});
});

describe("remapConnectPoints", () => {
	/** Two four-column cards, `column-card-1` at the origin and `column-card-2` to its right. */
	const twoColumnCards = (): CanvasDoc => {
		const doc = emptyDoc();
		columnOps.addObject(doc, "column-card", { x: 0, y: 0 });
		columnOps.addObject(doc, "column-card", { x: 300, y: 0 });
		return doc;
	};
	/**
	 * {@link twoColumnCards} with `connector-1` from `column-card-1`'s `col:1:right` and
	 * `connector-2` from its `col:2:right`, both to `column-card-2`'s `leftCenter`.
	 */
	const columnDoc = (): CanvasDoc => {
		const doc = twoColumnCards();
		columnOps.connect(doc, {
			sourceId: "column-card-1",
			targetId: "column-card-2",
			sourceAnchor: "col:1:right",
			targetAnchor: "leftCenter",
		});
		columnOps.connect(doc, {
			sourceId: "column-card-1",
			targetId: "column-card-2",
			sourceAnchor: "col:2:right",
			targetAnchor: "leftCenter",
		});
		return doc;
	};
	const sourceAnchorOf = (doc: CanvasDoc, id: string) =>
		(readObject(doc, id).source as { anchor: unknown }).anchor;
	const targetAnchorOf = (doc: CanvasDoc, id: string) =>
		(readObject(doc, id).target as { anchor: unknown }).anchor;

	it("swaps two connect points without mapping either end twice", () => {
		const doc = columnDoc();

		const moved = columnOps.remapConnectPoints(doc, "column-card-1", {
			"col:1:right": { kind: "connectPoint", id: "col:2:right" },
			"col:2:right": { kind: "connectPoint", id: "col:1:right" },
		});

		expect(sourceAnchorOf(doc, "connector-1")).toEqual({
			kind: "connectPoint",
			id: "col:2:right",
		});
		expect(sourceAnchorOf(doc, "connector-2")).toEqual({
			kind: "connectPoint",
			id: "col:1:right",
		});
		expect(moved).toEqual([
			{
				connectorId: "connector-1",
				end: "source",
				anchor: { kind: "connectPoint", id: "col:2:right" },
			},
			{
				connectorId: "connector-2",
				end: "source",
				anchor: { kind: "connectPoint", id: "col:1:right" },
			},
		]);
		expectValid(doc);
	});

	it("reaches a connector held inside a group", () => {
		const doc = twoColumnCards();
		doc.root.push({
			id: "group-1",
			type: "group",
			children: [
				{
					id: "connector-9",
					type: "connector",
					source: {
						owner: { id: "column-card-1" },
						anchor: { kind: "connectPoint", id: "col:1:right" },
					},
					target: {
						owner: { id: "column-card-2" },
						anchor: { kind: "center" },
					},
					points: [],
				},
			],
		} as unknown as ObjectDoc);

		const moved = columnOps.remapConnectPoints(doc, "column-card-1", {
			"col:1:right": { kind: "connectPoint", id: "col:3:right" },
		});

		expect(moved.map(({ connectorId }) => connectorId)).toEqual([
			"connector-9",
		]);
		expect(sourceAnchorOf(doc, "connector-9")).toEqual({
			kind: "connectPoint",
			id: "col:3:right",
		});
	});

	it("moves both ends of a connector looping back onto its owner", () => {
		const doc = twoColumnCards();
		columnOps.connect(doc, {
			sourceId: "column-card-1",
			targetId: "column-card-1",
			sourceAnchor: "col:1:right",
			targetAnchor: "col:2:left",
		});

		const moved = columnOps.remapConnectPoints(doc, "column-card-1", {
			"col:1:right": { kind: "connectPoint", id: "col:2:right" },
			"col:2:left": { kind: "connectPoint", id: "col:3:left" },
		});

		expect(moved.map(({ end }) => end)).toEqual(["source", "target"]);
		expect(targetAnchorOf(doc, "connector-1")).toEqual({
			kind: "connectPoint",
			id: "col:3:left",
		});
	});

	it("leaves ends on ids absent from the map, on other anchor kinds and on other owners alone", () => {
		const doc = columnDoc();
		columnOps.connect(doc, {
			sourceId: "column-card-1",
			targetId: "column-card-2",
			targetAnchor: "col:1:right",
		});
		const before = structuredClone(doc);

		const moved = columnOps.remapConnectPoints(doc, "column-card-1", {
			"col:9:right": { kind: "connectPoint", id: "col:1:right" },
			// column-card-1's own center end and column-card-2's col:1:right must both stay put
			center: { kind: "connectPoint", id: "col:1:right" },
		});

		expect(moved).toEqual([]);
		expect(doc).toEqual(before);
	});

	it("neither moves nor reports an end mapped to the id it already names", () => {
		const doc = columnDoc();
		const before = structuredClone(doc);

		const moved = columnOps.remapConnectPoints(doc, "column-card-1", {
			"col:1:right": { kind: "connectPoint", id: "col:1:right" },
		});

		expect(moved).toEqual([]);
		expect(doc).toEqual(before);
	});

	it("moves an end onto an edge position", () => {
		const doc = columnDoc();

		const moved = columnOps.remapConnectPoints(doc, "column-card-1", {
			"col:2:right": { kind: "edge", side: "right", t: 0.62 },
		});

		expect(moved).toEqual([
			{
				connectorId: "connector-2",
				end: "source",
				anchor: { kind: "edge", side: "right", t: 0.62 },
			},
		]);
		expect(sourceAnchorOf(doc, "connector-2")).toEqual({
			kind: "edge",
			side: "right",
			t: 0.62,
		});
		expectValid(doc);
	});

	it("re-derives the routing of a connector that never stored one when an end lands on a center", () => {
		const doc = columnDoc();

		columnOps.remapConnectPoints(doc, "column-card-1", {
			"col:1:right": { kind: "center" },
		});

		expect(sourceAnchorOf(doc, "connector-1")).toEqual({ kind: "center" });
		expect(readObject(doc, "connector-1").routing).toBe("straight");
		expect(readObject(doc, "connector-2").routing).toBeUndefined();
	});

	it.each([
		["an unknown kind", { kind: "free", point: { x: 0, y: 0 } }, "kind"],
		["an empty connectPoint id", { kind: "connectPoint", id: "" }, "id"],
		[
			"center as a connectPoint id",
			{ kind: "connectPoint", id: "center" },
			"center",
		],
		["an unknown edge side", { kind: "edge", side: "middle", t: 0.5 }, "side"],
		["an edge t outside 0..1", { kind: "edge", side: "top", t: 1.5 }, "t must"],
		[
			"an edge t that is not finite",
			{ kind: "edge", side: "top", t: Number.NaN },
			"t must",
		],
	])("refuses %s, having written nothing", (_label, value, fragment) => {
		const doc = columnDoc();
		const before = structuredClone(doc);

		expect(() =>
			columnOps.remapConnectPoints(doc, "column-card-1", {
				"col:1:right": { kind: "connectPoint", id: "col:2:right" },
				"col:2:right": value as never,
			}),
		).toThrow(DocOperationError);
		expect(() =>
			columnOps.remapConnectPoints(doc, "column-card-1", {
				"col:2:right": value as never,
			}),
		).toThrow(new RegExp(`^connect point remap "col:2:right": .*${fragment}`));
		expect(doc).toEqual(before);
	});

	it("refuses a connect point the owner does not offer after the change, having written nothing", () => {
		const doc = columnDoc();
		(doc.root[0] as Record<string, unknown>).columns = 2;
		const before = structuredClone(doc);

		expect(() =>
			columnOps.remapConnectPoints(doc, "column-card-1", {
				"col:1:right": { kind: "connectPoint", id: "col:0:right" },
				"col:2:right": { kind: "connectPoint", id: "col:3:right" },
			}),
		).toThrow(
			new DocOperationError(
				'connect point remap "col:2:right": "col:3:right" is not a connect point of "column-card-1" (column-card); it offers topCenter, rightCenter, bottomCenter, leftCenter and the 4 its type declares: col:0:left, col:0:right, col:1:left, col:1:right',
			),
		);
		expect(doc).toEqual(before);
	});

	it("refuses an owner the document does not hold", () => {
		expect(() =>
			columnOps.remapConnectPoints(columnDoc(), "missing", {}),
		).toThrow("object not found: missing");
	});
});
