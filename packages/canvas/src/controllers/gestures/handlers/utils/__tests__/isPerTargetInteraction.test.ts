import { describe, it, expect } from "vitest";

import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../isPerTargetInteraction";

const makeEvent = (button: number, type = "click"): CanvasEvent =>
	({ button, type }) as unknown as CanvasEvent;

describe("isPerTargetInteraction", () => {
	it("left button (0) -> true", () => {
		expect(isPerTargetInteraction(makeEvent(0))).toBe(true);
	});

	it("middle button (1) -> false (falls through to canvas pan)", () => {
		expect(isPerTargetInteraction(makeEvent(1))).toBe(false);
	});

	it("right button (2) -> false (falls through to canvas context menu)", () => {
		expect(isPerTargetInteraction(makeEvent(2))).toBe(false);
	});

	it("longPress -> false even on the left button (falls through to canvas context menu)", () => {
		expect(isPerTargetInteraction(makeEvent(0, "longPress"))).toBe(false);
	});
});
