import { describe, expect, it } from "vitest";

import { resolveInteractionStatus } from "../useInteractionHandle";

/**
 * Locks down which interactions count as busy. The rule is a contract hosts
 * wait on, and its whole point is that waiting terminates — so what is left out
 * (an armed drawing tool, an open modal) matters as much as what is in.
 */

type StatusInput = Parameters<typeof resolveInteractionStatus>[0];

const idleState: StatusInput = {
	activeDragKind: null,
	inertialScrolling: false,
	textEditState: null,
	shapeDrawing: null,
	activeModal: null,
};

const resolve = (overrides: Partial<StatusInput> = {}) =>
	resolveInteractionStatus({ ...idleState, ...overrides } as StatusInput);

const textEdit = {
	kind: "shape",
	objectId: "r1",
	slotId: "body",
	text: "",
} as unknown as StatusInput["textEditState"];

const armedTool = {
	preset: { id: "process", objectType: "rect" },
	preview: null,
} as unknown as StatusInput["shapeDrawing"];

describe("resolveInteractionStatus", () => {
	it("reports an untouched canvas as idle", () => {
		expect(resolve()).toEqual({
			drag: null,
			isInertialScrolling: false,
			editingTextId: null,
			drawingShapeType: null,
			modal: null,
			isBusy: false,
		});
	});

	it("is busy for a drag of any kind", () => {
		expect(resolve({ activeDragKind: "other" }).isBusy).toBe(true);
		expect(resolve({ activeDragKind: "move" }).isBusy).toBe(true);
		expect(resolve({ activeDragKind: "transform" }).isBusy).toBe(true);
	});

	it("is busy while the view coasts from a released pan", () => {
		expect(resolve({ inertialScrolling: true }).isBusy).toBe(true);
	});

	it("is busy while a text editor holds uncommitted text, and names the object", () => {
		const status = resolve({ textEditState: textEdit });
		expect(status.editingTextId).toBe("r1");
		expect(status.isBusy).toBe(true);
	});

	it("is not busy for an armed drawing tool, which waits on nobody's schedule", () => {
		const status = resolve({ shapeDrawing: armedTool });
		expect(status.drawingShapeType).toBe("rect");
		expect(status.drag).toBeNull();
		expect(status.isBusy).toBe(false);
	});

	it("keeps reporting the tool through the drag that draws with it, which is busy", () => {
		const drawing = {
			preset: { id: "process", objectType: "rect" },
			preview: { startX: 0, startY: 0, endX: 10, endY: 10 },
		} as unknown as StatusInput["shapeDrawing"];
		const status = resolve({ shapeDrawing: drawing, activeDragKind: "other" });
		expect(status.drawingShapeType).toBe("rect");
		expect(status.isBusy).toBe(true);
	});

	it("is not busy for an open modal, which an external write leaves alone", () => {
		const status = resolve({ activeModal: "export" });
		expect(status.modal).toBe("export");
		expect(status.isBusy).toBe(false);
	});

	it("derives isBusy from the fields it reports, so a true is always explainable", () => {
		for (const overrides of [
			{},
			{ activeDragKind: "move" as const },
			{ inertialScrolling: true },
			{ textEditState: textEdit },
			{ shapeDrawing: armedTool },
			{ activeModal: "export" as const },
		]) {
			const status = resolve(overrides);
			expect(status.isBusy).toBe(
				status.drag !== null ||
					status.isInertialScrolling ||
					status.editingTextId !== null,
			);
		}
	});
});
