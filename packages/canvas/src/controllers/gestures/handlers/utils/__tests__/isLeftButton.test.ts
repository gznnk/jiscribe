import { describe, it, expect } from "vitest";

import type { CanvasEvent } from "../../../registry/GestureHandlerTypes";
import { isLeftButton } from "../isLeftButton";

const makeEvent = (button: number): CanvasEvent =>
	({ button }) as unknown as CanvasEvent;

describe("isLeftButton", () => {
	it("left button (0) -> true", () => {
		expect(isLeftButton(makeEvent(0))).toBe(true);
	});

	it("middle button (1) -> false (falls through to canvas pan)", () => {
		expect(isLeftButton(makeEvent(1))).toBe(false);
	});

	it("right button (2) -> false (falls through to canvas context menu)", () => {
		expect(isLeftButton(makeEvent(2))).toBe(false);
	});
});
