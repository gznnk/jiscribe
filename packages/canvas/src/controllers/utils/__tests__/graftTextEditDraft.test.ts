import { describe, it, expect } from "vitest";

import { calcTextObjectFrameSize } from "../../../schemas/objects/primitives/text/calcTextObjectFrameSize";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { TextSlots } from "../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../CanvasTypes";
import { graftTextEditDraft } from "../graftTextEditDraft";

/** Family the derived-box path would measure with; irrelevant to every rect below. */
const FONT_FAMILY = "Noto Sans JP";

const textObj = (id: string, text: TextSlots): ObjectState =>
	({ id, type: "rect", text }) as unknown as ObjectState;

const slotsOf = (objects: Record<string, ObjectState>, id: string): TextSlots =>
	(objects[id] as unknown as { text: TextSlots }).text;

const shapeEdit = (
	objectId: string,
	slotId: string,
	text: string,
): CanvasControllerState["textEditState"] => ({
	kind: "shape",
	objectId,
	slotId,
	text,
});

describe("graftTextEditDraft", () => {
	it("returns the same reference when nothing is being edited", () => {
		const objects = { r1: textObj("r1", { name: { text: "User" } }) };
		expect(graftTextEditDraft(objects, null, FONT_FAMILY)).toBe(objects);
	});

	it("returns the same reference while a connector label is being edited", () => {
		const objects = { c1: { id: "c1", type: "connector" } as ObjectState };
		expect(
			graftTextEditDraft(
				objects,
				{
					kind: "connectorLabel",
					objectId: "c1",
					text: "calls",
				},
				FONT_FAMILY,
			),
		).toBe(objects);
	});

	it("returns the same reference while the draft still equals the committed text", () => {
		const objects = { r1: textObj("r1", { name: { text: "User" } }) };
		expect(
			graftTextEditDraft(objects, shapeEdit("r1", "name", "User"), FONT_FAMILY),
		).toBe(objects);
	});

	it("returns the same reference for a missing object or an unknown slot", () => {
		const objects = { r1: textObj("r1", { name: { text: "User" } }) };
		expect(
			graftTextEditDraft(objects, shapeEdit("gone", "name", "X"), FONT_FAMILY),
		).toBe(objects);
		expect(
			graftTextEditDraft(objects, shapeEdit("r1", "rows", "X"), FONT_FAMILY),
		).toBe(objects);
	});

	it("replaces only the edited slot's text on the edited object", () => {
		const objects = {
			r1: textObj("r1", {
				name: { text: "User", fontSize: 20 },
				rows: { text: ["id: string"] },
			}),
			r2: textObj("r2", { name: { text: "Order" } }),
		};

		const grafted = graftTextEditDraft(
			objects,
			shapeEdit("r1", "name", "User\nAccount"),
			FONT_FAMILY,
		);

		expect(grafted).not.toBe(objects);
		expect(slotsOf(grafted, "r1").name).toEqual({
			text: "User\nAccount",
			fontSize: 20,
		});
		// Objects other than the edited one, and the edited object's other slots,
		// keep their identity so their memoized components bail out.
		expect(grafted.r2).toBe(objects.r2);
		expect(slotsOf(grafted, "r1").rows).toBe(slotsOf(objects, "r1").rows);
		expect(objects.r1).not.toBe(grafted.r1);
	});

	it("splits the draft back into rows for a slot holding rows", () => {
		const objects = {
			r1: textObj("r1", { name: { text: "User" }, rows: { text: ["id"] } }),
		};

		const grafted = graftTextEditDraft(
			objects,
			shapeEdit("r1", "rows", "id\nname"),
			FONT_FAMILY,
		);

		expect(slotsOf(grafted, "r1").rows.text).toEqual(["id", "name"]);
		expect(slotsOf(grafted, "r1").name).toBe(slotsOf(objects, "r1").name);
	});

	it("re-measures the box of an object whose size is derived from its text", () => {
		const { width, height } = calcTextObjectFrameSize(
			"a",
			{ fontSize: 16 },
			FONT_FAMILY,
		);
		const objects = {
			t1: {
				id: "t1",
				type: "text",
				cx: 100 + width / 2,
				cy: 60 + height / 2,
				width,
				height,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
				text: { body: { text: "a", fontSize: 16 } },
			} as unknown as ObjectState,
		};

		const grafted = graftTextEditDraft(
			objects,
			shapeEdit("t1", "body", "a much longer draft"),
			FONT_FAMILY,
		) as unknown as Record<string, { cx: number; width: number }>;

		expect(grafted.t1.width).toBeGreaterThan(width);
		// The top-left is what the doc stores, so the draft may only extend right.
		expect(grafted.t1.cx - grafted.t1.width / 2).toBeCloseTo(100, 6);
	});

	it("leaves an object whose text is not the keyed normal form untouched", () => {
		const objects = {
			r1: { id: "r1", type: "rect", text: 123 } as unknown as ObjectState,
		};
		expect(
			graftTextEditDraft(objects, shapeEdit("r1", "name", "User"), FONT_FAMILY),
		).toBe(objects);
	});
});
