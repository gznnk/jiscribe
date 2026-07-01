import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../../../../../../../controllers/CanvasTypes";
import type { ObjectState } from "../../../../../../../../states/objects/base/ObjectState";
import { getSelectedLockAspectRatio } from "../getSelectedLockAspectRatio";

const obj = (id: string, extra?: Record<string, unknown>): ObjectState =>
	({ id, type: "rect", ...extra }) as unknown as ObjectState;

const state = (over: Partial<CanvasControllerState>): CanvasControllerState =>
	({
		objects: {},
		selectedIds: [],
		multiSelectGroup: null,
		...over,
	}) as unknown as CanvasControllerState;

describe("getSelectedLockAspectRatio", () => {
	it("no selection → false", () => {
		expect(getSelectedLockAspectRatio(state({}))).toBe(false);
	});

	it("single selection with lockAspectRatio=true → true", () => {
		const s = state({
			objects: { a: obj("a", { lockAspectRatio: true }) },
			selectedIds: ["a"],
		});
		expect(getSelectedLockAspectRatio(s)).toBe(true);
	});

	it("single selection where lockAspectRatio is not a boolean → false", () => {
		const s = state({
			objects: { a: obj("a", { lockAspectRatio: "yes" }) },
			selectedIds: ["a"],
		});
		expect(getSelectedLockAspectRatio(s)).toBe(false);
	});

	it("prefers multiSelectGroup when present", () => {
		const s = state({
			objects: { a: obj("a", { lockAspectRatio: false }) },
			selectedIds: ["a"],
			multiSelectGroup: {
				lockAspectRatio: true,
			} as CanvasControllerState["multiSelectGroup"],
		});
		expect(getSelectedLockAspectRatio(s)).toBe(true);
	});

	it("false when multiSelectGroup has no lockAspectRatio", () => {
		const s = state({
			multiSelectGroup: {} as CanvasControllerState["multiSelectGroup"],
		});
		expect(getSelectedLockAspectRatio(s)).toBe(false);
	});
});
