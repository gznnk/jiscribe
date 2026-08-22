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
import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import type { EdgeAnchorSide } from "../../model/objects/types/EndpointRef";
import { DocOperationError } from "../errors";

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
