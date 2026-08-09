import { describe, expect, it } from "vitest";

import { DEFAULT_FONT_FAMILY } from "../../../constants/defaultFontFamily";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { resolveTextEditTargetBox } from "../resolveTextEditTargetBox";

type TextEditState = CanvasControllerState["textEditState"];

const rectObj = (overrides: Record<string, unknown> = {}): ObjectState =>
	({
		id: "rect-1",
		type: "rect",
		cx: 100,
		cy: 100,
		width: 200,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		text: { body: "hello" },
		...overrides,
	}) as unknown as ObjectState;

/** A straight connector along y = 0 from x 0 to x 400, so its label sits at (200, 0). */
const longConnector = (label?: Record<string, unknown>): ObjectState =>
	({
		id: "connector-1",
		type: "connector",
		routing: "straight",
		points: [],
		source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
		target: { anchor: { kind: "free", point: { x: 400, y: 0 } } },
		label,
	}) as unknown as ObjectState;

const objectsOf = (...objects: ObjectState[]): Record<string, ObjectState> =>
	Object.fromEntries(objects.map((obj) => [obj.id, obj]));

describe("resolveTextEditTargetBox", () => {
	it("returns null when nothing is being edited", () => {
		expect(
			resolveTextEditTargetBox(null, objectsOf(rectObj()), DEFAULT_FONT_FAMILY),
		).toBeNull();
	});

	it("returns null when the target object is gone", () => {
		const textEditState: TextEditState = {
			kind: "shape",
			objectId: "missing",
			slotId: "body",
			text: "hello",
		};

		expect(
			resolveTextEditTargetBox(
				textEditState,
				objectsOf(rectObj()),
				DEFAULT_FONT_FAMILY,
			),
		).toBeNull();
	});

	it("gives a shape its own bounding box", () => {
		const textEditState: TextEditState = {
			kind: "shape",
			objectId: "rect-1",
			slotId: "body",
			text: "hello",
		};

		expect(
			resolveTextEditTargetBox(
				textEditState,
				objectsOf(rectObj()),
				DEFAULT_FONT_FAMILY,
			),
		).toEqual({ left: 0, top: 50, right: 200, bottom: 150 });
	});

	it("gives a rotated shape the AABB covering the rotation", () => {
		const textEditState: TextEditState = {
			kind: "shape",
			objectId: "rect-1",
			slotId: "body",
			text: "hello",
		};

		const bbox = resolveTextEditTargetBox(
			textEditState,
			objectsOf(rectObj({ rotation: 90 })),
			DEFAULT_FONT_FAMILY,
		);

		// A 200x100 box turned a quarter turn spans 100x200 around the center.
		expect(bbox?.left).toBeCloseTo(50);
		expect(bbox?.right).toBeCloseTo(150);
		expect(bbox?.top).toBeCloseTo(0);
		expect(bbox?.bottom).toBeCloseTo(200);
	});

	it("gives a connector label only the label box, not the route", () => {
		const textEditState: TextEditState = {
			kind: "connectorLabel",
			objectId: "connector-1",
			text: "hi",
		};

		const bbox = resolveTextEditTargetBox(
			textEditState,
			objectsOf(longConnector({ text: "hi" })),
			DEFAULT_FONT_FAMILY,
		);

		// Centered on the midpoint anchor, and far narrower than the 400-long route.
		expect(bbox).not.toBeNull();
		const width = (bbox?.right ?? 0) - (bbox?.left ?? 0);
		expect(width).toBeLessThan(100);
		expect((bbox?.left ?? 0) + width / 2).toBeCloseTo(200);
		expect((bbox?.top ?? 0) + (bbox?.bottom ?? 0)).toBeCloseTo(0);
	});

	it("sizes a connector label from the draft text, not the stored one", () => {
		const objects = objectsOf(longConnector({ text: "hi" }));
		const draft: TextEditState = {
			kind: "connectorLabel",
			objectId: "connector-1",
			text: "a much longer label than before",
		};
		const stored: TextEditState = {
			kind: "connectorLabel",
			objectId: "connector-1",
			text: "hi",
		};

		const draftBox = resolveTextEditTargetBox(
			draft,
			objects,
			DEFAULT_FONT_FAMILY,
		);
		const storedBox = resolveTextEditTargetBox(
			stored,
			objects,
			DEFAULT_FONT_FAMILY,
		);

		expect((draftBox?.right ?? 0) - (draftBox?.left ?? 0)).toBeGreaterThan(
			(storedBox?.right ?? 0) - (storedBox?.left ?? 0),
		);
	});

	it("places a connector label being created at its pending placement", () => {
		const textEditState: TextEditState = {
			kind: "connectorLabel",
			objectId: "connector-1",
			text: "hi",
			placement: { position: 0.25, offset: 0 },
		};

		const bbox = resolveTextEditTargetBox(
			textEditState,
			objectsOf(longConnector()),
			DEFAULT_FONT_FAMILY,
		);

		const centerX = ((bbox?.left ?? 0) + (bbox?.right ?? 0)) / 2;
		expect(centerX).toBeCloseTo(100);
	});

	it("returns null when the edited object is not a connector", () => {
		const textEditState: TextEditState = {
			kind: "connectorLabel",
			objectId: "rect-1",
			text: "hi",
		};

		expect(
			resolveTextEditTargetBox(
				textEditState,
				objectsOf(rectObj()),
				DEFAULT_FONT_FAMILY,
			),
		).toBeNull();
	});
});
