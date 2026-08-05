import { describe, expect, it } from "vitest";

import { RectFeatures } from "../../../../../schemas/objects/primitives/rect/RectDoc";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../../registries/ICanvasRegistries";
import { SelectionControlRegistry } from "../../../../ui/controls/SelectionControlRegistry";
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
		textEditState: {
			kind: "shape",
			objectId: "rect-1",
			slotId: "body",
			text: pendingText,
		},
		commitVersion: 5,
		contextMenuPosition: { x: 1, y: 1 },
	}) as unknown as CanvasControllerState;

/** A press on a control part no strategy handles, so handle() only runs the shared preamble. */
const makePressEvent = (pointerType?: string): CanvasEvent =>
	({
		type: "pressed",
		targetKind: "control",
		targetId: "rect-1",
		targetPart: "rotate",
		button: 0,
		pointerType,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as CanvasEvent;

const bodyTextOf = (state: CanvasControllerState): string =>
	(state.objects["rect-1"] as unknown as { text: { body: { text: string } } })
		.text.body.text;

describe("ControlEventHandler - text edit commit on press", () => {
	it("a mouse pressed commits the pending edit", () => {
		const handler = new ControlEventHandler([], new SelectionControlRegistry());
		const next = handler.handle(
			makeEditState("new"),
			makePressEvent("mouse"),
			registries,
		);
		expect(bodyTextOf(next)).toBe("new");
		expect(next.textEditState).toBeNull();
	});

	it("a touch pressed defers the commit (the press may still become a pinch), while still closing the context menu", () => {
		const handler = new ControlEventHandler([], new SelectionControlRegistry());
		const state = makeEditState("new");
		const next = handler.handle(state, makePressEvent("touch"), registries);
		expect(next.textEditState).toBe(state.textEditState);
		expect(bodyTextOf(next)).toBe("old");
		// The context-menu close on pressed is deliberately not deferred.
		expect(next.contextMenuPosition).toBeNull();
	});
});
