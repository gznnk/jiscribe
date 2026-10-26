import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import {
	applyActions,
	command,
	testReducerRegistries,
} from "./support/dispatch";
import type { TextSlots } from "../../../states/objects/types/TextSlots";
import { readRichTextSlot } from "../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../CanvasTypes";
import { resolveInteractionStatus } from "../../handles/useInteractionHandle";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { textSlotPartSelection } from "../../selection/__tests__/support/textSlotPartSelection";
import { readTextEditDraft } from "../../utils/readTextEditDraft";
import type { CanvasAction } from "../CanvasActions";
import { createCanvasReducer } from "../canvasReducer";

/**
 * The two axes of what the canvas is in the middle of — `mode` across drags,
 * `drag` for one — and the rules that hold between them: a drag on canvas
 * content never runs beside an open text edit, and only one mode is up at a
 * time.
 */

/** A rect at (0, 0)-(100, 40) whose body reads "hello". */
const textRectDoc: CanvasDoc = {
	version: 1,
	root: [
		{
			id: "rect-1",
			type: "rect",
			x: 0,
			y: 0,
			width: 100,
			height: 40,
			text: "hello",
		},
	],
} as unknown as CanvasDoc;

const bodyOf = (state: CanvasControllerState): RichText =>
	readRichTextSlot(
		(state.objects["rect-1"] as unknown as { text: TextSlots }).text,
		"body",
	);

/** An unstyled body, which RichText holds as the bare string. */
const typed = (text: string): RichText => text as RichText;

/** rect-1 mid-edit on its body, the draft already reading "hello world". */
const editingState = (): CanvasControllerState =>
	createTestState(textRectDoc, {
		selection: selectionOf(["rect-1"], textSlotPartSelection("body")),
		mode: {
			kind: "textEdit",
			draft: { kind: "shape", text: typed("hello world") },
		},
	});

/**
 * A pointer gesture, from (50, 20) to `last`.
 *
 * @param target - Where the pointer went down; `button` defaults to the left one
 */
const gesture = (
	type: "pressed" | "dragStart" | "drag" | "dragEnd",
	target: {
		targetKind: string;
		targetId?: string;
		targetAction?: string;
		pointerType?: "mouse" | "touch";
		button?: number;
	},
	last = { x: 70, y: 20 },
): CanvasAction =>
	({
		type: "GESTURE",
		gesture: {
			type,
			button: 0,
			pointerType: "mouse",
			...target,
			start: { x: 50, y: 20 },
			last,
			clientLast: last,
			delta: { x: last.x - 50, y: last.y - 20 },
			clientDelta: { x: last.x - 50, y: last.y - 20 },
			mods: { shift: false, alt: false, ctrl: false, meta: false },
		},
	}) as unknown as CanvasAction;

const reducer = createCanvasReducer(testReducerRegistries);

const onRect = { targetKind: "object", targetId: "rect-1" } as const;
const onObjectMenu = { targetKind: "menu", targetId: "object-menu" } as const;

describe("canvasReducer (integration)", () => {
	describe("a drag opening over an open text edit", () => {
		it("commits it into the snapshot of a touch drag on a shape, so the frames keep the text", () => {
			const touchOnRect = { ...onRect, pointerType: "touch" } as const;
			// A touch press waits to see whether it becomes a pinch, so the
			// session is still open when the drag starts.
			const pressed = applyActions(editingState(), [
				gesture("pressed", touchOnRect),
			]);
			expect(pressed.mode.kind).toBe("textEdit");

			const started = applyActions(pressed, [
				gesture("dragStart", touchOnRect),
			]);
			expect(started.mode.kind).toBe("normal");
			expect(started.drag?.kind).toBe("move");
			expect(
				bodyOf({
					...started,
					objects: started.drag?.startSnapshot.objects ?? {},
				}),
			).toEqual(typed("hello world"));

			// Not through applyActions: a drag frame holds a copy-on-write view,
			// which its deep freeze cannot walk.
			const dragged = reducer(
				started,
				gesture("drag", touchOnRect, { x: 90, y: 20 }),
			);
			expect(bodyOf(dragged)).toEqual(typed("hello world"));
			const ended = reducer(
				dragged,
				gesture("dragEnd", touchOnRect, { x: 90, y: 20 }),
			);
			expect(bodyOf(ended)).toEqual(typed("hello world"));
			expect(ended.objects["rect-1"]).toMatchObject({ cx: 90 });
		});

		it("commits it for a drag off the StencilLibrary", () => {
			const started = applyActions(editingState(), [
				gesture("dragStart", {
					targetKind: "menu",
					targetId: "stencil-library",
					targetAction: "item:rect",
				}),
			]);
			expect(started.drag?.kind).toBe("stencil");
			expect(started.mode.kind).toBe("normal");
			expect(bodyOf(started)).toEqual(typed("hello world"));
		});

		it("keeps it open through a one-finger pan of the background", () => {
			const touchOnCanvas = {
				targetKind: "canvas",
				targetId: "canvas",
				pointerType: "touch",
			} as const;
			const panned = applyActions(editingState(), [
				gesture("pressed", touchOnCanvas),
				gesture("dragStart", touchOnCanvas),
				gesture("drag", touchOnCanvas, { x: 120, y: 60 }),
			]);
			expect(panned.drag?.kind).toBe("pan");
			expect(readTextEditDraft(panned)).toEqual({
				kind: "shape",
				text: typed("hello world"),
			});
		});

		it("keeps it open through a drag on the ObjectMenu", () => {
			const dragging = applyActions(editingState(), [
				gesture("pressed", onObjectMenu),
				gesture("dragStart", onObjectMenu),
			]);
			expect(dragging.drag?.kind).toBe("menu");
			expect(dragging.mode.kind).toBe("textEdit");
		});
	});

	describe("text-edit actions while a drag holds the session open", () => {
		/** The session under a menu drag, the one kind of drag a mouse can hold beside it. */
		const editingUnderMenuDrag = (): CanvasControllerState =>
			applyActions(editingState(), [gesture("dragStart", onObjectMenu)]);

		it("refuses a committing END_TEXT_EDIT, leaving the session open", () => {
			const state = editingUnderMenuDrag();
			expect(
				applyActions(state, [{ type: "END_TEXT_EDIT", commit: true }]),
			).toBe(state);
		});

		it("still takes a keystroke into the draft, which reaches no object", () => {
			const state = editingUnderMenuDrag();
			const updated = applyActions(state, [
				{ type: "UPDATE_TEXT_EDIT", text: typed("hello there") },
			]);
			expect(readTextEditDraft(updated)).toMatchObject({
				text: typed("hello there"),
			});
			expect(updated.objects).toBe(state.objects);
		});

		it("still lets Escape cancel the session, which writes nothing", () => {
			const state = editingUnderMenuDrag();
			const cancelled = applyActions(state, [
				{ type: "END_TEXT_EDIT", commit: false },
			]);
			expect(cancelled.mode.kind).toBe("normal");
			expect(cancelled.objects).toBe(state.objects);
		});
	});

	describe("the drawing tool", () => {
		const armedState = (): CanvasControllerState => {
			const preset = testReducerRegistries.stencil.get("rect");
			if (!preset) {
				throw new Error("the test registries carry no rect preset");
			}
			return createTestState(textRectDoc, {
				mode: { kind: "draw", preset },
			});
		};
		const onCanvas = { targetKind: "canvas", targetId: "canvas" } as const;

		it("stays armed through the drag that draws with it, and disarms at its end", () => {
			const drawing = applyActions(armedState(), [
				gesture("pressed", onCanvas, { x: 200, y: 200 }),
				gesture("dragStart", onCanvas, { x: 200, y: 200 }),
				gesture("drag", onCanvas, { x: 300, y: 260 }),
			]);
			expect(drawing.mode.kind).toBe("draw");
			expect(drawing.drag?.kind).toBe("draw");

			const drawn = applyActions(drawing, [
				gesture("dragEnd", onCanvas, { x: 300, y: 260 }),
			]);
			expect(drawn.mode.kind).toBe("normal");
			expect(drawn.rootIds).toHaveLength(2);
		});

		it("gives way to a text edit opened over it (select all, then Enter)", () => {
			const editing = applyActions(armedState(), [
				command("selectAll"),
				command("start-text-edit"),
			]);
			const status = resolveInteractionStatus(editing);
			expect(status.editingTextId).toBe("rect-1");
			expect(status.drawingShapeType).toBeNull();
		});

		it("gives way to a text edit opened by a double click on a shape", () => {
			const editing = applyActions(armedState(), [
				{
					type: "GESTURE",
					gesture: {
						...(gesture("pressed", onRect) as { gesture: object }).gesture,
						type: "doubleClick",
					},
				} as CanvasAction,
			]);
			const status = resolveInteractionStatus(editing);
			expect(status.editingTextId).toBe("rect-1");
			expect(status.drawingShapeType).toBeNull();
		});
	});
});
