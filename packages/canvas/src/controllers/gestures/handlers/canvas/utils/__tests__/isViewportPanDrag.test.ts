import { describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { isViewportPanDrag } from "../isViewportPanDrag";

const stateWith = (preset: object | null): CanvasControllerState =>
	({
		mode: preset === null ? { kind: "normal" } : { kind: "draw", preset },
	}) as unknown as CanvasControllerState;

describe("isViewportPanDrag", () => {
	it("a canvas-target drag outside draw mode is a pan", () => {
		expect(isViewportPanDrag("canvas", stateWith(null))).toBe(true);
	});

	it("draw mode claims canvas-target drags (not a pan)", () => {
		expect(isViewportPanDrag("canvas", stateWith({}))).toBe(false);
	});

	it("object and control drags are never pans", () => {
		expect(isViewportPanDrag("object", stateWith(null))).toBe(false);
		expect(isViewportPanDrag("control", stateWith(null))).toBe(false);
	});

	it("a target with no data-kind ancestor (undefined) is not a pan", () => {
		expect(isViewportPanDrag(undefined, stateWith(null))).toBe(false);
	});
});
