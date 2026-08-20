import { roundToDecimal } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import { DEFAULT_FONT_FAMILY } from "../../../constants/fontFamilies";
import { PRECISION } from "../../../constants/precision";
import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { calcTextObjectFrameSize } from "../../../states/objects/primitives/text/calcTextObjectFrameSize";
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

/** Family a host on another theme would hand in, distinct from the built-in one. */
const OTHER_FONT_FAMILY = "Some Other Family";

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

/** Box a text of this content is measured to, the built-in family standing in for the theme's. */
const measuredBoxOf = (text: string) =>
	calcTextObjectFrameSize(text, { fontSize: 16 }, DEFAULT_FONT_FAMILY);

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
	describe("SET_DOC_DEFAULTS", () => {
		it("re-measures every text box when the host swaps the theme's family", () => {
			// A family change invalidates every measurement at once, so the pass has to
			// bypass its own "the slots did not move" skip. Nothing else in this
			// transition touches the object.
			const state = stateWithStaleTextBox("hello");

			const after = canvasReducer(state, {
				type: "SET_DOC_DEFAULTS",
				docDefaults: { fontFamily: OTHER_FONT_FAMILY },
			});

			expect(after.docDefaults.fontFamily).toBe(OTHER_FONT_FAMILY);
			expect(boxOf(after, "text-1")).toEqual({
				...measuredBoxOf("hello"),
				left: TEXT_ORIGIN.x,
				top: TEXT_ORIGIN.y,
			});
		});

		it("does not record history, the doc storing no size to have changed", () => {
			const state = stateWithStaleTextBox("hello");

			const after = canvasReducer(state, {
				type: "SET_DOC_DEFAULTS",
				docDefaults: { fontFamily: OTHER_FONT_FAMILY },
			});

			expect(after.commitVersion).toBe(state.commitVersion);
			expect(after.history.past).toHaveLength(0);
		});

		it("returns the same state for the family it already holds", () => {
			// The mount-time sync dispatches this unconditionally, so an unchanged
			// family must not produce a new state object.
			const state = stateWithStaleTextBox("hello");

			expect(
				canvasReducer(state, {
					type: "SET_DOC_DEFAULTS",
					docDefaults: { fontFamily: DEFAULT_FONT_FAMILY },
				}),
			).toBe(state);
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
		/** Registries whose text resizer records the family it was handed. */
		const createSpyingRegistries = () => {
			const registries = createTestRegistries();
			const measuredFamilies: string[] = [];
			const resizeToContent = registries.objectContentResizer.get("text");
			if (!resizeToContent) {
				throw new Error("the test registries register no resizer for text");
			}
			registries.objectContentResizer.register("text", (object, context) => {
				measuredFamilies.push(context.fontFamily);
				return resizeToContent(object, context);
			});
			return { registries, measuredFamilies };
		};

		/** State whose text has been rewritten and committed once, ready to be undone. */
		const afterRewriting = (
			reducer: ReturnType<typeof createCanvasReducer>,
			docDefaults: { fontFamily: string },
		): CanvasControllerState => {
			const state = {
				...createTestState(docWithText("hello"), { docDefaults }),
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
			let state = afterRewriting(reducer, {
				fontFamily: DEFAULT_FONT_FAMILY,
			});
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

		it("re-derives the restored boxes with the canvas's own theme family", () => {
			// The load-bearing assertion of the pair: the doc carries no size, so undo
			// re-measures from scratch, and handing the resizer anything but the family
			// the text is drawn in shrinks the box a few percent on every undo.
			const { registries, measuredFamilies } = createSpyingRegistries();
			const reducer = createCanvasReducer(registries);
			const state = afterRewriting(reducer, { fontFamily: OTHER_FONT_FAMILY });
			measuredFamilies.length = 0;

			reducer(state, { type: "COMMAND", commandId: "undo" });

			expect(measuredFamilies).not.toEqual([]);
			expect(new Set(measuredFamilies)).toEqual(new Set([OTHER_FONT_FAMILY]));
		});

		it("re-derives with that family on redo too", () => {
			const { registries, measuredFamilies } = createSpyingRegistries();
			const reducer = createCanvasReducer(registries);
			const undone = reducer(
				afterRewriting(reducer, { fontFamily: OTHER_FONT_FAMILY }),
				{ type: "COMMAND", commandId: "undo" },
			);
			measuredFamilies.length = 0;

			reducer(undone, { type: "COMMAND", commandId: "redo" });

			expect(measuredFamilies).not.toEqual([]);
			expect(new Set(measuredFamilies)).toEqual(new Set([OTHER_FONT_FAMILY]));
		});
	});
});
