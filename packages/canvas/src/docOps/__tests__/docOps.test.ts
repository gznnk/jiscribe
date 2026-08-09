import { describe, expect, it } from "vitest";

import { parseCanvasText } from "../../schemas/canvas/validators";
import { createFrameObjectFactory } from "../../schemas/objects/utils/createFrameObjectFactory";
import type { ObjectDocDefinition } from "../../schemas/plugin/ObjectDocDefinition";
import { createDocOps } from "../createDocOps";
import { DocOperationError } from "../errors";

/** Fresh empty CanvasDoc per call, never shared between tests. */
const emptyDoc = () => ({ version: 1 as const, root: [] });

/** Serialize the doc, run it through validation, and assert it is valid. */
const expectValid = (doc: { version: 1; root: unknown[] }) => {
	const result = parseCanvasText(`${JSON.stringify(doc, null, "\t")}\n`);
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

	// A point-geometry factory sizes itself from its text, so the top-left only
	// survives the center-based createDoc when the measurement sees that text.
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
		// Exact: the factory rounds the corner it derives from the center, so the
		// caller gets the position it asked for rather than float residue.
		expect(text.x).toBe(100);
		expect(text.y).toBe(100);
		expectValid(doc);
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
