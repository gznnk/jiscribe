import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import type { ResizedAxes } from "../../../../../../../states/registry/ObjectContentResizerRegistry";
import type { CanvasControllerState } from "../../../../../../CanvasTypes";
import { selectionOf } from "../../../../../../selection/__tests__/support/selectionOf";
import type { CanvasEvent } from "../../../../../registry/GestureHandlerTypes";
import type { TransformAnchorType } from "../../TransformAnchorType";
import {
	calcResizedAxes,
	calcTransformDragResize,
} from "../calcTransformDragResize";

const rect = (overrides: Record<string, unknown> = {}): ObjectState =>
	({
		id: "r",
		type: "rect",
		cx: 50,
		cy: 50,
		width: 100,
		height: 100,
		...overrides,
	}) as unknown as ObjectState;

const stateOf = (
	object: ObjectState,
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		mode: { kind: "normal" },
		objects: { [object.id]: object },
		selection: selectionOf([object.id]),
		multiSelectGroup: null,
		...overrides,
	}) as unknown as CanvasControllerState;

const dragStart = (shift = false): CanvasEvent =>
	({ type: "dragStart", mods: { shift } }) as unknown as CanvasEvent;

describe("calcResizedAxes", () => {
	const cases: [TransformAnchorType, ResizedAxes][] = [
		["leftCenter", { width: "end" }],
		["rightCenter", { width: "start" }],
		["topCenter", { height: "end" }],
		["bottomCenter", { height: "start" }],
		["topLeft", { width: "end", height: "end" }],
		["topRight", { width: "start", height: "end" }],
		["bottomLeft", { width: "end", height: "start" }],
		["bottomRight", { width: "start", height: "start" }],
	];
	it.each(cases)("%s writes %o", (anchor, axes) => {
		expect(calcResizedAxes(stateOf(rect()), dragStart(), anchor)).toEqual(axes);
	});

	it("makes an edge handle write both axes while Shift is held, the other about its middle", () => {
		expect(
			calcResizedAxes(stateOf(rect()), dragStart(true), "leftCenter"),
		).toEqual({ width: "end", height: "center" });
		expect(
			calcResizedAxes(stateOf(rect()), dragStart(true), "bottomCenter"),
		).toEqual({ width: "center", height: "start" });
	});

	it("keeps a corner's held edges while Shift is held", () => {
		expect(
			calcResizedAxes(stateOf(rect()), dragStart(true), "topRight"),
		).toEqual({ width: "start", height: "end" });
	});

	it("makes every edge handle write both axes on a locked aspect ratio", () => {
		const locked = stateOf(rect({ lockAspectRatio: true }));

		expect(calcResizedAxes(locked, dragStart(), "rightCenter")).toEqual({
			width: "start",
			height: "center",
		});
		expect(calcResizedAxes(locked, dragStart(), "topCenter")).toEqual({
			width: "center",
			height: "end",
		});
	});

	it("reads the multi-select group's lock rather than the objects'", () => {
		const state = stateOf(rect(), {
			multiSelectGroup: {
				lockAspectRatio: true,
			} as CanvasControllerState["multiSelectGroup"],
		});

		expect(calcResizedAxes(state, dragStart(), "bottomCenter")).toEqual({
			width: "center",
			height: "start",
		});
	});

	it("answers null for the rotation knob", () => {
		expect(
			calcResizedAxes(stateOf(rect()), dragStart(), "rotation"),
		).toBeNull();
	});
});

describe("calcTransformDragResize", () => {
	const turned = rect({ rotation: 30, scaleX: -1, scaleY: 1 });

	it("states the axes in the frame of the one selected object", () => {
		expect(
			calcTransformDragResize(stateOf(turned), dragStart(), "rightCenter"),
		).toEqual({
			axes: { width: "start" },
			frame: { rotation: 30, scaleX: -1, scaleY: 1 },
		});
	});

	it("states them in the multi-select group's frame for several objects", () => {
		const state = stateOf(turned, {
			selection: selectionOf(["r", "s"]),
			multiSelectGroup: {
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			} as CanvasControllerState["multiSelectGroup"],
		});

		expect(
			calcTransformDragResize(state, dragStart(), "bottomCenter")?.frame,
		).toEqual({ rotation: 0, scaleX: 1, scaleY: 1 });
	});

	it("answers null for the rotation knob and for a frame without a transform", () => {
		expect(
			calcTransformDragResize(stateOf(turned), dragStart(), "rotation"),
		).toBeNull();
		expect(
			calcTransformDragResize(stateOf(rect()), dragStart(), "bottomRight"),
		).toBeNull();
	});
});
