import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { PRECISION } from "@jiscribe/doc/model/objects/utils/precision";
import { calcTextObjectFrameSize } from "@jiscribe/doc/text/object/calcTextObjectFrameSize";
import { roundToDecimal } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { resolveTextObjectFont } from "../../../states/objects/primitives/text/resolveTextObjectFont";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { ClipboardData } from "../../commands/selection/ClipboardData";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { createCanvasReducer } from "../canvasReducer";

/**
 * The reducer paths that have to keep a derived box current. A `text` doc stores
 * only its top-left corner, so a path that forgets to re-measure does not draw a
 * wrong box once — it leaves a wrong box behind that survives every reload.
 *
 * The boxes here are compared against `calcTextObjectFrameSize`, the one function
 * every derivation path goes through, rather than against literals: outside a
 * browser the widths are estimated, so a literal would pin the estimate rather
 * than the wiring.
 */

/** The corner the doc stores, which every re-measurement has to leave where it is. */
const TEXT_ORIGIN = { x: 100, y: 60 };

const canvasReducer = createCanvasReducer(createTestRegistries());

const docWithText = (text: string): CanvasDoc =>
	({
		version: 1,
		root: [
			{
				id: "text-1",
				type: "text",
				x: TEXT_ORIGIN.x,
				y: TEXT_ORIGIN.y,
				text,
				fontSize: 16,
			},
		],
	}) as unknown as CanvasDoc;

/** Box a text of this content is measured to. */
const measuredBoxOf = (text: string) =>
	calcTextObjectFrameSize(text, resolveTextObjectFont({ fontSize: 16 }));

/**
 * The size and stored corner of a text object, the two things a derivation
 * decides. The corner is rounded the way the doc stores it — a bare
 * `cx - width / 2` carries float noise the coordinate itself does not.
 */
const boxOf = (state: CanvasControllerState, id: string) => {
	const object = state.objects[id] as unknown as {
		cx: number;
		cy: number;
		width: number;
		height: number;
	};
	return {
		width: object.width,
		height: object.height,
		left: roundToDecimal(object.cx - object.width / 2, PRECISION.COORDINATE),
		top: roundToDecimal(object.cy - object.height / 2, PRECISION.COORDINATE),
	};
};

/**
 * The same object with its box shrunk to 1x1 around the corner it holds — what a
 * text measured under a font this canvas does not draw in looks like. Node's
 * estimate reads no font at all, so staleness has to be built rather than
 * produced by naming another family.
 */
const withStaleBox = (object: ObjectState): ObjectState => {
	const frame = object as unknown as {
		cx: number;
		cy: number;
		width: number;
		height: number;
	};
	return {
		...object,
		cx: frame.cx - frame.width / 2 + 0.5,
		cy: frame.cy - frame.height / 2 + 0.5,
		width: 1,
		height: 1,
	} as ObjectState;
};

const stateWithStaleTextBox = (text: string): CanvasControllerState => {
	const base = createTestState(docWithText(text));
	return {
		...base,
		objects: {
			...base.objects,
			"text-1": withStaleBox(base.objects["text-1"]),
		},
	};
};

describe("canvasReducer (integration)", () => {
	describe("REMEASURE_TEXT", () => {
		it("re-measures every text box, though neither the slots nor the family moved", () => {
			// What a web font finishing after the first paint looks like: the family
			// is the one it always was, and every box derived before the face landed
			// was measured against a fallback. Nothing in the state says so, which is
			// why the pass has to be asked for.
			const state = stateWithStaleTextBox("hello");

			const after = canvasReducer(state, { type: "REMEASURE_TEXT" });

			expect(boxOf(after, "text-1")).toEqual({
				...measuredBoxOf("hello"),
				left: TEXT_ORIGIN.x,
				top: TEXT_ORIGIN.y,
			});
		});

		it("hands back the same state when no box moved, so repeating it is free", () => {
			// Both font events can fire for one load, and every later unicode-range
			// fetch fires another.
			const state = canvasReducer(stateWithStaleTextBox("hello"), {
				type: "REMEASURE_TEXT",
			});

			expect(canvasReducer(state, { type: "REMEASURE_TEXT" })).toBe(state);
		});

		it("does not record history, the doc storing no size to have changed", () => {
			const state = stateWithStaleTextBox("hello");

			const after = canvasReducer(state, { type: "REMEASURE_TEXT" });

			expect(after.history).toBe(state.history);
		});
	});

	describe("PASTE", () => {
		/** Clipboard holding one text object, its box already stale. */
		const clipboardWithStaleTextBox = (
			state: CanvasControllerState,
		): ClipboardData => ({
			__type: "jiscribe-canvas-clipboard",
			version: 1,
			objects: { "text-1": withStaleBox(state.objects["text-1"]) },
			rootIds: ["text-1"],
			center: TEXT_ORIGIN,
		});

		it("lands a pasted text on a box measured from its own text", () => {
			// The clipboard is untrusted input and may come from a canvas on another
			// theme, so the box it carries is never the one to keep.
			const state = createTestState(docWithText("hello"));

			const after = canvasReducer(state, {
				type: "PASTE",
				data: clipboardWithStaleTextBox(state),
			});

			const pastedId = after.selectedIds[0];
			expect(pastedId).not.toBe("text-1");
			expect(boxOf(after, pastedId)).toEqual({
				...measuredBoxOf("hello"),
				// PASTE_OFFSET, applied to the corner the box grows from.
				left: TEXT_ORIGIN.x + 20,
				top: TEXT_ORIGIN.y + 20,
			});
		});

		it("leaves the pasted-onto text alone", () => {
			const state = createTestState(docWithText("hello"));
			const before = boxOf(state, "text-1");

			const after = canvasReducer(state, {
				type: "PASTE",
				data: clipboardWithStaleTextBox(state),
			});

			expect(boxOf(after, "text-1")).toEqual(before);
		});
	});

	describe("undo / redo of a text object", () => {
		/** State whose text has been rewritten and committed once, ready to be undone. */
		const afterRewriting = (
			reducer: ReturnType<typeof createCanvasReducer>,
		): CanvasControllerState => {
			const state = {
				...createTestState(docWithText("hello")),
				textEditState: {
					kind: "shape" as const,
					objectId: "text-1",
					slotId: "body",
					text: "hello world",
				},
			};
			return reducer(state, { type: "END_TEXT_EDIT", commit: true });
		};

		it("restores the box of the text it restores, and redo the newer one", () => {
			const reducer = createCanvasReducer(createTestRegistries());
			let state = afterRewriting(reducer);
			expect(boxOf(state, "text-1").width).toBe(
				measuredBoxOf("hello world").width,
			);

			state = reducer(state, { type: "COMMAND", commandId: "undo" });
			expect(boxOf(state, "text-1")).toEqual({
				...measuredBoxOf("hello"),
				left: TEXT_ORIGIN.x,
				top: TEXT_ORIGIN.y,
			});

			state = reducer(state, { type: "COMMAND", commandId: "redo" });
			expect(boxOf(state, "text-1")).toEqual({
				...measuredBoxOf("hello world"),
				left: TEXT_ORIGIN.x,
				top: TEXT_ORIGIN.y,
			});
		});
	});
});
