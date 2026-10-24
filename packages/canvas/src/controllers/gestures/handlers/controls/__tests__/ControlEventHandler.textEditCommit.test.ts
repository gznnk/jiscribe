import { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../../registries/ICanvasRegistries";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import { textSlotPartSelection } from "../../../../selection/__tests__/support/textSlotPartSelection";
import { SelectionControlRegistry } from "../../../../ui/controls/SelectionControlRegistry";
import { readTextEditDraft } from "../../../../utils/readTextEditDraft";
import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { ControlEventHandler } from "../ControlEventHandler";

const registries = undefined as unknown as ICanvasRegistries;

const makeTextRect = (id: string, text: string): ObjectState =>
	({
		id,
		type: "rect",
		features: RectFeatures,
		cx: 0,
		cy: 0,
		width: 10,
		height: 10,
		text: { body: { text } },
	}) as unknown as ObjectState;

/** State while editing rect-1's text, with a pending (uncommitted) `pendingText`. */
const makeEditState = (pendingText: string): CanvasControllerState =>
	({
		objects: { "rect-1": makeTextRect("rect-1", "old") },
		selection: selectionOf(["rect-1"], textSlotPartSelection("body")),
		mode: { kind: "textEdit", draft: { kind: "shape", text: pendingText } },
		commitVersion: 5,
		drag: null,
		contextMenuPosition: { x: 1, y: 1 },
	}) as unknown as CanvasControllerState;

/** A press on a control action no strategy handles, so handle() only runs the shared preamble. */
const makePressEvent = (pointerType?: string): CanvasEvent =>
	({
		type: "pressed",
		targetKind: "control",
		targetId: "rect-1",
		targetAction: "rotate",
		button: 0,
		pointerType,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const bodyTextOf = (state: CanvasControllerState): string =>
	(state.objects["rect-1"] as unknown as { text: { body: { text: string } } })
		.text.body.text;

describe("ControlEventHandler - text edit commit", () => {
	it("a mouse pressed commits the pending edit", () => {
		const handler = new ControlEventHandler([], new SelectionControlRegistry());
		const next = handler.handle(
			makeEditState("new"),
			makePressEvent("mouse"),
			registries,
		);
		expect(bodyTextOf(next)).toBe("new");
		expect(readTextEditDraft(next)).toBeNull();
	});

	it("a touch pressed defers the commit (the press may still become a pinch), while still closing the context menu", () => {
		const handler = new ControlEventHandler([], new SelectionControlRegistry());
		const state = makeEditState("new");
		const next = handler.handle(state, makePressEvent("touch"), registries);
		expect(readTextEditDraft(next)).toBe(readTextEditDraft(state));
		expect(bodyTextOf(next)).toBe("old");
		// The context-menu close on pressed is deliberately not deferred.
		expect(next.contextMenuPosition).toBeNull();
	});

	it("a touch dragStart commits into the drag's start snapshot before routing, so a selection control's frames keep the text", () => {
		const selectionControls = new SelectionControlRegistry();
		// Rebuilds its object from the snapshot, as every selection control does
		selectionControls.register("rect", [
			{
				name: "marker",
				Component: () => null,
				handle: (context) => ({
					object: {
						...context.startObject,
						marked: true,
					} as unknown as ObjectState,
				}),
			},
		]);
		const handler = new ControlEventHandler([], selectionControls);
		const editing = makeEditState("new");
		// As handleGesture opens it: frozen over the uncommitted objects
		const opened = {
			...editing,
			drag: {
				kind: "inert",
				snapFeedback: null,
				axisLockFeedback: null,
				edgeScrollEnabled: false,
				startSnapshot: { objects: editing.objects },
			},
		} as unknown as CanvasControllerState;
		const touchDrag = (type: "dragStart" | "drag"): CanvasEvent =>
			({
				...makePressEvent("touch"),
				type,
				targetAction: "selection:rect:marker",
				start: { x: 0, y: 0 },
				last: { x: 5, y: 0 },
				delta: { x: 5, y: 0 },
			}) as unknown as CanvasEvent;

		const started = handler.handle(opened, touchDrag("dragStart"), registries);
		expect(readTextEditDraft(started)).toBeNull();
		expect(started.drag?.kind).toBe("selectionControl");

		const dragged = handler.handle(started, touchDrag("drag"), registries);
		expect(dragged.objects["rect-1"]).toMatchObject({ marked: true });
		expect(bodyTextOf(dragged)).toBe("new");
	});
});
