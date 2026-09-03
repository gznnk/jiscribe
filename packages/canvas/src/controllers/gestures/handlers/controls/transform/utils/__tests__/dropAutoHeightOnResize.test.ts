import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../../CanvasTypes";
import type { CanvasEvent } from "../../../../../registry/GestureHandlerTypes";
import { dropAutoHeightOnResize } from "../dropAutoHeightOnResize";

const autoObject = (overrides: Record<string, unknown> = {}): ObjectState =>
	({
		id: "auto",
		type: "rect",
		cx: 100,
		cy: 50,
		width: 200,
		height: 60,
		autoHeight: true,
		...overrides,
	}) as unknown as ObjectState;

/** A dragStart state with the snapshot the handler reads every frame from. */
const dragStartState = (
	object: ObjectState,
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		objects: { [object.id]: object },
		selectedIds: [object.id],
		multiSelectGroup: null,
		eventStartSnapshot: {
			objects: { [object.id]: object },
			selectedIdsWithDescendants: new Set([object.id]),
		},
		...overrides,
	}) as unknown as CanvasControllerState;

const dragStart = (shift = false): CanvasEvent =>
	({ type: "dragStart", mods: { shift } }) as unknown as CanvasEvent;

describe("dropAutoHeightOnResize", () => {
	it("settles the height on a corner handle, snapshot included", () => {
		const state = dragStartState(autoObject());

		const dropped = dropAutoHeightOnResize(state, dragStart(), "bottomRight");

		expect(dropped.objects.auto.autoHeight).toBeUndefined();
		expect(dropped.eventStartSnapshot?.objects.auto.autoHeight).toBeUndefined();
	});

	it("settles it on a top or bottom handle", () => {
		const state = dragStartState(autoObject());

		expect(
			dropAutoHeightOnResize(state, dragStart(), "topCenter").objects.auto
				.autoHeight,
		).toBeUndefined();
	});

	it("keeps it on a left or right handle, which only re-wraps the text", () => {
		const state = dragStartState(autoObject());

		for (const anchor of ["leftCenter", "rightCenter"] as const) {
			expect(dropAutoHeightOnResize(state, dragStart(), anchor)).toBe(state);
		}
	});

	it("settles it on a side handle held with shift, which scales both axes", () => {
		const state = dragStartState(autoObject());

		expect(
			dropAutoHeightOnResize(state, dragStart(true), "rightCenter").objects.auto
				.autoHeight,
		).toBeUndefined();
	});

	it("settles it on a side handle of a shape with its ratio locked", () => {
		const state = dragStartState(autoObject({ lockAspectRatio: true }));

		expect(
			dropAutoHeightOnResize(state, dragStart(), "leftCenter").objects.auto
				.autoHeight,
		).toBeUndefined();
	});

	it("leaves the rotation handle alone: it changes no extent", () => {
		const state = dragStartState(autoObject());

		expect(dropAutoHeightOnResize(state, dragStart(), "rotation")).toBe(state);
	});

	it("returns the state itself when nothing was following its text", () => {
		const state = dragStartState(autoObject({ autoHeight: undefined }));

		expect(dropAutoHeightOnResize(state, dragStart(), "bottomRight")).toBe(
			state,
		);
	});
});
