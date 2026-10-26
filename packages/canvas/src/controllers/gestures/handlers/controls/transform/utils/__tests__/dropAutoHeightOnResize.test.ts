import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../../CanvasTypes";
import { selectionOf } from "../../../../../../selection/__tests__/support/selectionOf";
import type { CanvasEvent } from "../../../../../registry/GestureHandlerTypes";
import type { TransformAnchorType } from "../../TransformAnchorType";
import { calcTransformDragResize } from "../calcTransformDragResize";
import { dropAutoHeightOnResize } from "../dropAutoHeightOnResize";

const autoObject = (overrides: Record<string, unknown> = {}): ObjectState =>
	({
		id: "auto",
		type: "rect",
		cx: 100,
		cy: 50,
		width: 200,
		height: 60,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		autoHeight: true,
		...overrides,
	}) as unknown as ObjectState;

/** A dragStart state with the snapshot the handler reads every frame from. */
const dragStartState = (
	object: ObjectState,
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		mode: { kind: "normal" },
		objects: { [object.id]: object },
		selection: selectionOf([object.id]),
		multiSelectGroup: null,
		drag: {
			kind: "inert",
			snapFeedback: null,
			axisLockFeedback: null,
			edgeScrollEnabled: false,
			startSnapshot: {
				objects: { [object.id]: object },
				selectedIdsWithDescendants: new Set([object.id]),
			},
		},
		...overrides,
	}) as unknown as CanvasControllerState;

const dragStart = (shift = false): CanvasEvent =>
	({ type: "dragStart", mods: { shift } }) as unknown as CanvasEvent;

/** The drop a dragStart on `anchor` performs, the axes read off the anchor and Shift as the handler reads them. */
const dropOnDragStart = (
	state: CanvasControllerState,
	anchor: TransformAnchorType,
	shift = false,
): CanvasControllerState =>
	dropAutoHeightOnResize(
		state,
		calcTransformDragResize(state, dragStart(shift), anchor),
	);

describe("dropAutoHeightOnResize", () => {
	it("settles the height on a corner handle, snapshot included", () => {
		const state = dragStartState(autoObject());

		const dropped = dropOnDragStart(state, "bottomRight");

		expect(dropped.objects.auto.autoHeight).toBeUndefined();
		expect(dropped.drag?.startSnapshot.objects.auto.autoHeight).toBeUndefined();
	});

	it("settles it on a top or bottom handle", () => {
		const state = dragStartState(autoObject());

		expect(
			dropOnDragStart(state, "topCenter").objects.auto.autoHeight,
		).toBeUndefined();
	});

	it("keeps it on a left or right handle, which only re-wraps the text", () => {
		const state = dragStartState(autoObject());

		for (const anchor of ["leftCenter", "rightCenter"] as const) {
			expect(dropOnDragStart(state, anchor)).toBe(state);
		}
	});

	it("settles it on a side handle held with shift, which scales both axes", () => {
		const state = dragStartState(autoObject());

		expect(
			dropOnDragStart(state, "rightCenter", true).objects.auto.autoHeight,
		).toBeUndefined();
	});

	it("settles it on a side handle of a shape with its ratio locked", () => {
		const state = dragStartState(autoObject({ lockAspectRatio: true }));

		expect(
			dropOnDragStart(state, "leftCenter").objects.auto.autoHeight,
		).toBeUndefined();
	});

	it("leaves the rotation handle alone: it changes no extent", () => {
		const state = dragStartState(autoObject());

		expect(dropOnDragStart(state, "rotation")).toBe(state);
	});

	it("reads each shape's height in its own frame: a child turned 90° has it written by a side handle", () => {
		const turnedChild = autoObject({ id: "child", rotation: 90 });
		const level = autoObject({ id: "level" });
		const group = {
			id: "g",
			type: "group",
			cx: 100,
			cy: 50,
			width: 200,
			height: 200,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		} as unknown as ObjectState;
		const objects = { g: group, child: turnedChild, level };
		const state = {
			objects,
			selection: selectionOf(["g"]),
			multiSelectGroup: null,
			drag: {
				kind: "inert",
				snapFeedback: null,
				axisLockFeedback: null,
				edgeScrollEnabled: false,
				startSnapshot: {
					objects,
					selectedIdsWithDescendants: new Set(["g", "child", "level"]),
				},
			},
		} as unknown as CanvasControllerState;

		const dropped = dropOnDragStart(state, "rightCenter");

		expect(dropped.objects.child.autoHeight).toBeUndefined();
		expect(dropped.objects.level.autoHeight).toBe(true);
	});

	it("returns the state itself when nothing was following its text", () => {
		const state = dragStartState(autoObject({ autoHeight: undefined }));

		expect(dropOnDragStart(state, "bottomRight")).toBe(state);
	});
});
