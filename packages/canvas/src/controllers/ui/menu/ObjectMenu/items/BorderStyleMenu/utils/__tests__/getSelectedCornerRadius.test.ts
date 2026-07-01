import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../../../../../../../controllers/CanvasTypes";
import type { ObjectState } from "../../../../../../../../states/objects/base/ObjectState";
import {
	DEFAULT_CORNER_RADIUS,
	getSelectedCornerRadius,
} from "../getSelectedCornerRadius";

const obj = (id: string, extra?: Record<string, unknown>): ObjectState =>
	({ id, type: "rect", ...extra }) as unknown as ObjectState;

const state = (
	objects: Record<string, ObjectState>,
	selectedIds: string[],
): CanvasControllerState =>
	({ objects, selectedIds }) as unknown as CanvasControllerState;

describe("getSelectedCornerRadius", () => {
	it("no selection → default value", () => {
		expect(getSelectedCornerRadius(state({}, []))).toBe(DEFAULT_CORNER_RADIUS);
	});

	it("has rx → its value", () => {
		const s = state({ a: obj("a", { rx: 12 }) }, ["a"]);
		expect(getSelectedCornerRadius(s)).toBe(12);
	});

	it("rx is not a number → default value", () => {
		const s = state({ a: obj("a", { rx: "round" }) }, ["a"]);
		expect(getSelectedCornerRadius(s)).toBe(DEFAULT_CORNER_RADIUS);
	});
});
