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
	it("選択なし → false", () => {
		expect(getSelectedLockAspectRatio(state({}))).toBe(false);
	});

	it("単一選択で lockAspectRatio=true → true", () => {
		const s = state({
			objects: { a: obj("a", { lockAspectRatio: true }) },
			selectedIds: ["a"],
		});
		expect(getSelectedLockAspectRatio(s)).toBe(true);
	});

	it("単一選択で lockAspectRatio が boolean でない → false", () => {
		const s = state({
			objects: { a: obj("a", { lockAspectRatio: "yes" }) },
			selectedIds: ["a"],
		});
		expect(getSelectedLockAspectRatio(s)).toBe(false);
	});

	it("multiSelectGroup があればそちらを優先する", () => {
		const s = state({
			objects: { a: obj("a", { lockAspectRatio: false }) },
			selectedIds: ["a"],
			multiSelectGroup: {
				lockAspectRatio: true,
			} as CanvasControllerState["multiSelectGroup"],
		});
		expect(getSelectedLockAspectRatio(s)).toBe(true);
	});

	it("multiSelectGroup に lockAspectRatio が無ければ false", () => {
		const s = state({
			multiSelectGroup: {} as CanvasControllerState["multiSelectGroup"],
		});
		expect(getSelectedLockAspectRatio(s)).toBe(false);
	});
});
