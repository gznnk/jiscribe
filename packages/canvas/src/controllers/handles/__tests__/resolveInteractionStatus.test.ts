import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { textSlotPartSelection } from "../../selection/__tests__/support/textSlotPartSelection";
import { resolveInteractionStatus } from "../useInteractionHandle";

/**
 * Locks down which interactions count as busy. The rule is a contract hosts
 * wait on, and its whole point is that waiting terminates — so what is left out
 * (an armed drawing tool, an open modal) matters as much as what is in.
 */

type StatusInput = Parameters<typeof resolveInteractionStatus>[0];

/** The object every text-edit case here is open on. */
const slottedRect = {
	id: "r1",
	type: "rect",
	text: { body: { text: "" } },
} as unknown as ObjectState;

const idleState: StatusInput = {
	drag: null,
	inertialScrolling: false,
	mode: { kind: "normal" },
	selection: { objectIds: [], part: null },
	objects: { r1: slottedRect },
	activeModal: null,
};

const resolve = (overrides: Partial<StatusInput> = {}) =>
	resolveInteractionStatus({ ...idleState, ...overrides } as StatusInput);

/** A drag of the given kind; its start snapshot is never read by the status. */
const dragOf = (kind: string): StatusInput["drag"] =>
	({ kind }) as unknown as StatusInput["drag"];

/** A session open on r1's body slot: the draft, plus the selection that owns it. */
const textEdit: Partial<StatusInput> = {
	mode: { kind: "textEdit", draft: { kind: "shape", text: "" } },
	selection: { objectIds: ["r1"], part: textSlotPartSelection("body") },
};

const armedTool = {
	kind: "draw",
	preset: { id: "process", objectType: "rect" },
} as unknown as StatusInput["mode"];

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

	it("reports the drag by its kind", () => {
		expect(resolve({ drag: dragOf("marquee") }).drag).toBe("marquee");
	});

	it("is busy for a drag of any kind", () => {
		expect(resolve({ drag: dragOf("inert") }).isBusy).toBe(true);
		expect(resolve({ drag: dragOf("move") }).isBusy).toBe(true);
		expect(resolve({ drag: dragOf("transform") }).isBusy).toBe(true);
	});

	it("is busy while the view coasts from a released pan", () => {
		expect(resolve({ inertialScrolling: true }).isBusy).toBe(true);
	});

	it("is busy while a text editor holds uncommitted text, and names the object", () => {
		const status = resolve(textEdit);
		expect(status.editingTextId).toBe("r1");
		expect(status.isBusy).toBe(true);
	});

	it("is not busy for an armed drawing tool, which waits on nobody's schedule", () => {
		const status = resolve({ mode: armedTool });
		expect(status.drawingShapeType).toBe("rect");
		expect(status.drag).toBeNull();
		expect(status.isBusy).toBe(false);
	});

	it("keeps reporting the tool through the drag that draws with it, which is busy", () => {
		const status = resolve({ mode: armedTool, drag: dragOf("draw") });
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
			{ drag: dragOf("move") },
			{ inertialScrolling: true },
			textEdit,
			{ mode: armedTool },
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
