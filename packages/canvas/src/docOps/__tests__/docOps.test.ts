import { describe, expect, it } from "vitest";

import { createCanvasParser } from "../../schemas/canvas/validators";
import type { EdgeAnchorSide } from "../../schemas/objects/types/EndpointRef";
import { createFrameObjectFactory } from "../../schemas/objects/utils/createFrameObjectFactory";
import type { ObjectDocDefinition } from "../../schemas/plugin/ObjectDocDefinition";
import { createDocOps } from "../createDocOps";
import { DocOperationError } from "../errors";

/** Fresh empty CanvasDoc per call, never shared between tests. */
const emptyDoc = () => ({ version: 1 as const, root: [] });

/** Serialize the doc, run it through validation, and assert it is valid. */
const expectValid = (doc: { version: 1; root: unknown[] }) => {
	const result = createCanvasParser().parse(
		`${JSON.stringify(doc, null, "\t")}\n`,
	);
	expect(result.kind).toBe("ok");
};

/** Default doc-ops, built-in definitions only. */
const docOps = createDocOps();

describe("addObject", () => {
	it("assigns friendly sequential ids and keeps top-left coordinates", () => {
		const doc = emptyDoc();
		const first = docOps.addObject(doc, "rect", { x: 40, y: 40 });
		const second = docOps.addObject(doc, "rect", {
			x: 0,
			y: 0,
			width: 200,
			height: 100,
		});

		expect(first).toBe("rect-1");
		expect(second).toBe("rect-2");

		const rect = doc.root[0] as Record<string, unknown>;
		expect(rect.x).toBe(40);
		expect(rect.y).toBe(40);
	});

	it("uses the factory's default dimensions when width/height are omitted", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });

		// RECT_DOC_DEFAULTS (100x100) — the factory default, not the old docOps constant.
		const rect = doc.root[0] as Record<string, unknown>;
		expect(rect.width).toBe(100);
		expect(rect.height).toBe(100);
	});

	it("carries ObjectFactory style defaults (not a bare object)", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });

		const rect = doc.root[0] as Record<string, unknown>;
		expect(rect).toMatchObject({ fill: expect.any(String), fontSize: 16 });
		expectValid(doc);
	});

	it("propagates text only when provided", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, text: "hello" });

		const rect = doc.root[0] as Record<string, unknown>;
		expect(rect.text).toBe("hello");
	});

	it("places a center-based ellipse from a top-left bounding box", () => {
		const doc = emptyDoc();
		// Top-left (320, 40) with a 160x100 box gives center (400, 90), rx 80, ry 50.
		const id = docOps.addObject(doc, "ellipse", {
			x: 320,
			y: 40,
			width: 160,
			height: 100,
		});

		expect(id).toBe("ellipse-1");
		const ellipse = doc.root[0] as Record<string, unknown>;
		expect(ellipse.cx).toBe(400);
		expect(ellipse.cy).toBe(90);
		expect(ellipse.rx).toBe(80);
		expect(ellipse.ry).toBe(50);
		expectValid(doc);
	});

	// A point-geometry doc stores the top-left and no box, so the position reaches
	// the doc untouched — no measurement, and nothing to offset a center by.
	it("keeps the given top-left for a point-geometry type", () => {
		const doc = emptyDoc();
		const id = docOps.addObject(doc, "text", {
			x: 100,
			y: 100,
			text: "Hello World",
		});

		expect(id).toBe("text-1");
		const text = doc.root[0] as Record<string, unknown>;
		expect(text.type).toBe("text");
		expect(text.x).toBe(100);
		expect(text.y).toBe(100);
		expectValid(doc);
	});

	it("keeps a fractional top-left exact for a point-geometry type", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "text", { x: 12.5, y: -7.25, text: "Hello World" });

		const text = doc.root[0] as Record<string, unknown>;
		expect(text.x).toBe(12.5);
		expect(text.y).toBe(-7.25);
	});

	it("keeps box fields out of a point-geometry doc", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "text", { x: 0, y: 0, text: "sized by content" });

		const text = doc.root[0] as Record<string, unknown>;
		expect(text).not.toHaveProperty("width");
		expect(text).not.toHaveProperty("height");
	});

	it("throws DocOperationError when a point-geometry type is given a size", () => {
		const doc = emptyDoc();

		expect(() =>
			docOps.addObject(doc, "text", { x: 0, y: 0, width: 200 }),
		).toThrow(DocOperationError);
		expect(() =>
			docOps.addObject(doc, "text", { x: 0, y: 0, height: 40 }),
		).toThrow(DocOperationError);
		expect(doc.root).toHaveLength(0);
	});

	it("throws DocOperationError for an unknown type", () => {
		const doc = emptyDoc();
		expect(() => docOps.addObject(doc, "nope", { x: 0, y: 0 })).toThrow(
			DocOperationError,
		);
	});

	it("throws DocOperationError for a defined type without a factory", () => {
		const doc = emptyDoc();
		// group / connector / svg are defined but not programmatically creatable.
		expect(() => docOps.addObject(doc, "group", { x: 0, y: 0 })).toThrow(
			DocOperationError,
		);
	});
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
	/** Two rects at (0,0) and (400,0), ready to hang a connector off. */
	const twoRects = () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		docOps.addObject(doc, "rect", { x: 400, y: 0 });
		return doc;
	};

	it("stores a target point as a free endpoint carrying no owner", () => {
		const doc = twoRects();

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
		const doc = twoRects();

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
		const doc = twoRects();
		const point = { x: 10, y: 20 };

		docOps.connect(doc, { sourceId: "rect-1", targetPoint: point });
		point.x = 999;

		const connector = doc.root[2] as Record<string, unknown>;
		expect(connector.target).toMatchObject({
			anchor: { point: { x: 10, y: 20 } },
		});
	});

	it("keeps the orthogonal default when the attached end has a direction", () => {
		const doc = twoRects();

		docOps.connect(doc, {
			sourceId: "rect-1",
			sourceAnchor: "rightCenter",
			targetPoint: { x: 260, y: 180 },
		});

		// defaultRoutingForAnchors only turns straight for a center, and a free end is not one.
		expect((doc.root[2] as Record<string, unknown>).routing).toBeUndefined();
	});

	it("turns straight when the attached end is a center", () => {
		const doc = twoRects();

		docOps.connect(doc, {
			sourceId: "rect-1",
			targetPoint: { x: 260, y: 180 },
		});

		expect((doc.root[2] as Record<string, unknown>).routing).toBe("straight");
	});

	it.each(["source", "target"] as const)(
		"throws DocOperationError when the %s end names both an object and a point",
		(end) => {
			const doc = twoRects();
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
			const doc = twoRects();
			const otherEnd = end === "source" ? "target" : "source";

			expect(() =>
				docOps.connect(doc, { [`${otherEnd}Id`]: "rect-1" }),
			).toThrow(new RegExp(`${end} end got neither ${end}Id nor ${end}Point`));
		},
	);

	it("throws DocOperationError when a point is paired with an anchor", () => {
		const doc = twoRects();

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
		const doc = twoRects();
		const before = JSON.stringify(doc);

		expect(() =>
			docOps.connect(doc, { sourceId: "rect-1", targetPoint: point }),
		).toThrow(DocOperationError);
		expect(JSON.stringify(doc)).toBe(before);
	});

	// The doc model reserves a line owned by nothing for polyline (see validateConnectorDoc).
	it("throws DocOperationError when both ends are points", () => {
		const doc = twoRects();
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

describe("createDocOps with a plugin definition", () => {
	// The dependency direction stops a canvas test from importing a real plugin, so build a
	// fake connectable shape "star" with createFrameObjectFactory.
	const starDefinition: ObjectDocDefinition = {
		features: {
			type: "star",
			geometry: "rect",
			transform: true,
			connectable: true,
		},
		validateDoc: () => [],
		factory: createFrameObjectFactory({
			type: "star",
			width: 120,
			height: 80,
			fill: "transparent",
			stroke: "auto",
			strokeWidth: 2,
		}),
	};
	const starPlugin = { id: "star-plugin", objects: { star: starDefinition } };

	it("adds and connects a plugin-supplied shape", () => {
		const pluginOps = createDocOps({ plugins: [starPlugin] });
		const doc = emptyDoc();

		const starId = pluginOps.addObject(doc, "star", {
			x: 10,
			y: 20,
			width: 100,
			height: 50,
		});
		expect(starId).toBe("star-1");
		const star = doc.root[0] as Record<string, unknown>;
		expect(star).toMatchObject({ type: "star", x: 10, y: 20 });
		expect(star.width).toBe(100);
		expect(star.height).toBe(50);

		const rectId = pluginOps.addObject(doc, "rect", { x: 300, y: 0 });
		const connectorId = pluginOps.connect(doc, {
			sourceId: starId,
			targetId: rectId,
		});
		expect(connectorId).toBe("connector-1");
	});

	it("throws at construction when a plugin duplicates a preset type", () => {
		expect(() =>
			createDocOps({
				plugins: [{ id: "dup-plugin", objects: { rect: starDefinition } }],
			}),
		).toThrow(/dup-plugin/);
	});
});
