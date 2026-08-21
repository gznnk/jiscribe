import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { calcTextObjectFrameSize } from "../../../states/objects/primitives/text/calcTextObjectFrameSize";
import type { TextSlots } from "../../../states/objects/types/TextSlots";
import { createObjectContentResizerRegistry } from "../../../states/registry/ObjectContentResizerRegistry";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { graftTextEditDraft } from "../graftTextEditDraft";

/** The real per-type wiring, so only `text` is re-measured here. */
const contentResizer = createTestRegistries().objectContentResizer;

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
		expect(graftTextEditDraft(objects, null, contentResizer)).toBe(objects);
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
				contentResizer,
			),
		).toBe(objects);
	});

	it("returns the same reference while the draft still equals the committed text", () => {
		const objects = { r1: textObj("r1", { name: { text: "User" } }) };
		expect(
			graftTextEditDraft(
				objects,
				shapeEdit("r1", "name", "User"),
				contentResizer,
			),
		).toBe(objects);
	});

	it("returns the same reference for a missing object or an unknown slot", () => {
		const objects = { r1: textObj("r1", { name: { text: "User" } }) };
		expect(
			graftTextEditDraft(
				objects,
				shapeEdit("gone", "name", "X"),
				contentResizer,
			),
		).toBe(objects);
		expect(
			graftTextEditDraft(objects, shapeEdit("r1", "rows", "X"), contentResizer),
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
			contentResizer,
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
			contentResizer,
		);

		expect(slotsOf(grafted, "r1").rows.text).toEqual(["id", "name"]);
		expect(slotsOf(grafted, "r1").name).toBe(slotsOf(objects, "r1").name);
	});

	it("re-measures the box of an object whose size is derived from its text", () => {
		const { width, height } = calcTextObjectFrameSize("a", { fontSize: 16 });
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
			contentResizer,
		) as unknown as Record<string, { cx: number; width: number }>;

		expect(grafted.t1.width).toBeGreaterThan(width);
		// The top-left is what the doc stores, so the draft may only extend right.
		expect(grafted.t1.cx - grafted.t1.width / 2).toBeCloseTo(100, 6);
	});

	it("never calls a resizer for a type that has none registered", () => {
		// The rect is grafted, but the registry holds nothing for its type, so the
		// resizer is not consulted and the stored box passes through.
		const registry = createObjectContentResizerRegistry();
		const seenTypes: string[] = [];
		registry.register("text", (state) => {
			seenTypes.push(state.type);
			return state;
		});
		const objects = { r1: textObj("r1", { name: { text: "User" } }) };

		const grafted = graftTextEditDraft(
			objects,
			shapeEdit("r1", "name", "Account"),
			registry,
		);

		expect(seenTypes).toEqual([]);
		expect(slotsOf(grafted, "r1").name.text).toBe("Account");
	});

	it("leaves an object whose text is not the keyed normal form untouched", () => {
		const objects = {
			r1: { id: "r1", type: "rect", text: 123 } as unknown as ObjectState,
		};
		expect(
			graftTextEditDraft(
				objects,
				shapeEdit("r1", "name", "User"),
				contentResizer,
			),
		).toBe(objects);
	});
});
