import { describe, expect, it } from "vitest";

import type { CanvasEvent } from "../../../../registry/GestureHandlerTypes";
import { isSnapSuppressed } from "../isSnapSuppressed";

const makeEvent = (
	ctrl: boolean,
	scrollDelta?: { deltaX: number; deltaY: number },
): Pick<CanvasEvent, "mods" | "scrollDelta"> => ({
	mods: { shift: false, alt: false, ctrl, meta: false },
	scrollDelta,
});

describe("isSnapSuppressed", () => {
	it("lets an ordinary tick snap", () => {
		expect(isSnapSuppressed(makeEvent(false))).toBe(false);
	});

	it("stands down while Ctrl is held", () => {
		expect(isSnapSuppressed(makeEvent(true))).toBe(true);
	});

	it("stands down on a tick that moved the viewport", () => {
		expect(isSnapSuppressed(makeEvent(false, { deltaX: 8, deltaY: 0 }))).toBe(
			true,
		);
	});

	// The field's presence is the signal, not its size: a scroll a viewport bound
	// swallowed still marks a tick the pointer alone did not drive.
	it("stands down on a scrolling tick whose delta is zero", () => {
		expect(isSnapSuppressed(makeEvent(false, { deltaX: 0, deltaY: 0 }))).toBe(
			true,
		);
	});
});
