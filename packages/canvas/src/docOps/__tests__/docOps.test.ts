import { describe, expect, it } from "vitest";

import { parseCanvasText } from "../../schemas/canvas/validators";
import { addEllipse } from "../addEllipse";
import { addRect } from "../addRect";
import { connect } from "../connect";
import { DocOperationError } from "../errors";

/** 空の CanvasDoc を毎回新規に作る（テスト間で共有しない）。 */
const emptyDoc = () => ({ version: 1 as const, root: [] });

/** doc をシリアライズして正検証を通し、valid であることを表明する。 */
const expectValid = (doc: { version: 1; root: unknown[] }) => {
	const result = parseCanvasText(`${JSON.stringify(doc, null, "\t")}\n`);
	expect(result.kind).toBe("ok");
};

describe("addRect", () => {
	it("assigns friendly sequential ids and keeps top-left coordinates", () => {
		const doc = emptyDoc();
		const first = addRect(doc, { x: 40, y: 40 });
		const second = addRect(doc, { x: 0, y: 0, width: 200, height: 100 });

		expect(first).toBe("rect-1");
		expect(second).toBe("rect-2");

		const rect = doc.root[0] as Record<string, unknown>;
		expect(rect.x).toBe(40);
		expect(rect.y).toBe(40);
	});

	it("carries ObjectFactory style defaults (not a bare object)", () => {
		const doc = emptyDoc();
		addRect(doc, { x: 0, y: 0 });

		const rect = doc.root[0] as Record<string, unknown>;
		expect(rect).toMatchObject({ fill: expect.any(String), fontSize: 16 });
		expectValid(doc);
	});
});

describe("addEllipse", () => {
	it("places at the center and assigns a friendly id", () => {
		const doc = emptyDoc();
		const id = addEllipse(doc, { cx: 400, cy: 90 });

		expect(id).toBe("ellipse-1");
		const ellipse = doc.root[0] as Record<string, unknown>;
		expect(ellipse.cx).toBe(400);
		expect(ellipse.cy).toBe(90);
		expectValid(doc);
	});
});

describe("connect", () => {
	it("connects two top-level objects into a valid document", () => {
		const doc = emptyDoc();
		const source = addRect(doc, { x: 0, y: 0 });
		const target = addEllipse(doc, { cx: 400, cy: 0 });

		const id = connect(doc, {
			sourceId: source,
			targetId: target,
			endArrow: "FilledTriangle",
		});

		expect(id).toBe("connector-1");
		expectValid(doc);
	});

	it("defaults to straight routing for the center-to-center default (no anchors)", () => {
		const doc = emptyDoc();
		const source = addRect(doc, { x: 0, y: 0 });
		const target = addEllipse(doc, { cx: 400, cy: 0 });

		connect(doc, { sourceId: source, targetId: target });

		const connector = doc.root[2] as Record<string, unknown>;
		expect(connector.source).toMatchObject({ anchor: { kind: "center" } });
		expect(connector.target).toMatchObject({ anchor: { kind: "center" } });
		expect(connector.routing).toBe("straight");
		expectValid(doc);
	});

	it("omits routing (orthogonal default) when both ends pin to an edge midpoint", () => {
		const doc = emptyDoc();
		const source = addRect(doc, { x: 0, y: 0 });
		const target = addRect(doc, { x: 400, y: 0 });

		connect(doc, {
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
							textType: "text",
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
		const source = addRect(doc, { x: 0, y: 0 });

		expect(() =>
			connect(doc, { sourceId: source, targetId: "inner-rect" }),
		).not.toThrow();
		expectValid(doc);
	});

	it("throws DocOperationError for a missing id", () => {
		const doc = emptyDoc();
		const source = addRect(doc, { x: 0, y: 0 });

		expect(() =>
			connect(doc, { sourceId: source, targetId: "missing" }),
		).toThrow(DocOperationError);
	});

	it("throws DocOperationError when the target is not connectable", () => {
		const doc = emptyDoc();
		const first = addRect(doc, { x: 0, y: 0 });
		const second = addRect(doc, { x: 400, y: 0 });
		const connectorId = connect(doc, { sourceId: first, targetId: second });

		// A connector itself is not a connectable type.
		expect(() =>
			connect(doc, { sourceId: first, targetId: connectorId }),
		).toThrow(DocOperationError);
	});
});
