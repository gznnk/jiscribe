import { describe, expect, it } from "vitest";

import { createCanvasToolDescriptors } from "../canvasTools";
import type { CanvasToolDescriptor } from "../canvasTools";
import {
	isCanvasHandleTool,
	toDrivesMismatchText,
	toOutcomeText,
	toThrownText,
} from "../toolHosting";

const descriptors = createCanvasToolDescriptors({
	creatableObjectTypes: ["rect"],
	connectableObjectTypes: ["rect"],
});

const findDescriptor = (name: string): CanvasToolDescriptor => {
	const found = descriptors.find((descriptor) => descriptor.name === name);
	expect(found, `tool ${name} should exist`).toBeDefined();
	return found as CanvasToolDescriptor;
};

describe("isCanvasHandleTool", () => {
	it("tells a tool driving the canvas handle from one a document answers", () => {
		expect(isCanvasHandleTool(findDescriptor("capture_canvas"))).toBe(true);
		expect(isCanvasHandleTool(findDescriptor("fit_view"))).toBe(true);
		expect(isCanvasHandleTool(findDescriptor("add_object"))).toBe(false);
		expect(isCanvasHandleTool(findDescriptor("undo"))).toBe(false);
	});
});

describe("toDrivesMismatchText", () => {
	it("names the way the op disagreed with the declaration", () => {
		expect(toDrivesMismatchText(findDescriptor("add_object"))).toBe(
			"internal error: add_object is declared to need only a document but produced a canvas-handle operation",
		);
		expect(toDrivesMismatchText(findDescriptor("capture_canvas"))).toBe(
			"internal error: capture_canvas is declared to drive the canvas handle but produced a document operation",
		);
	});
});

describe("toOutcomeText", () => {
	it("passes a success through unchanged", () => {
		expect(toOutcomeText({ ok: true, text: "added rect" })).toBe("added rect");
	});

	it("prefixes a failure with error:", () => {
		expect(toOutcomeText({ ok: false, text: "no object x" })).toBe(
			"error: no object x",
		);
	});

	it("keeps an internal error: prefix rather than doubling it", () => {
		expect(toOutcomeText({ ok: false, text: "internal error: boom" })).toBe(
			"internal error: boom",
		);
	});
});

describe("toThrownText", () => {
	class UserFacingError extends Error {}
	const isUserFacing = (error: unknown): error is Error =>
		error instanceof UserFacingError;

	it("shows a user error's message after error:", () => {
		expect(toThrownText(new UserFacingError("no file"), isUserFacing)).toBe(
			"error: no file",
		);
	});

	it("marks anything else, a thrown non-Error included, as internal", () => {
		expect(toThrownText(new Error("boom"), isUserFacing)).toBe(
			"internal error: boom",
		);
		expect(toThrownText("plain", isUserFacing)).toBe("internal error: plain");
	});
});
