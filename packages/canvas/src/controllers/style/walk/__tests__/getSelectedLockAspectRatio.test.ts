import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import { getSelectedLockAspectRatio } from "../getSelectedLockAspectRatio";

// The real bundle, so the lock is read through the very table a write to it
// would land on (applyObjectDefinition).
const registries = createTestRegistries();

const obj = (id: string, extra?: Record<string, unknown>): ObjectState =>
	({ id, type: "rect", ...extra }) as unknown as ObjectState;

const state = (over: Partial<CanvasControllerState>): CanvasControllerState =>
	({
		objects: {},
		selection: selectionOf([]),
		multiSelectGroup: null,
		...over,
	}) as unknown as CanvasControllerState;

describe("getSelectedLockAspectRatio", () => {
	it("no selection → false", () => {
		expect(getSelectedLockAspectRatio(state({}), registries)).toBe(false);
	});

	it("single selection with lockAspectRatio=true → true", () => {
		const s = state({
			objects: { a: obj("a", { lockAspectRatio: true }) },
			selection: selectionOf(["a"]),
		});
		expect(getSelectedLockAspectRatio(s, registries)).toBe(true);
	});

	it("single selection where lockAspectRatio is not a boolean → false", () => {
		const s = state({
			objects: { a: obj("a", { lockAspectRatio: "yes" }) },
			selection: selectionOf(["a"]),
		});
		expect(getSelectedLockAspectRatio(s, registries)).toBe(false);
	});

	it("prefers multiSelectGroup when present", () => {
		const s = state({
			objects: { a: obj("a", { lockAspectRatio: false }) },
			selection: selectionOf(["a"]),
			multiSelectGroup: {
				lockAspectRatio: true,
			} as CanvasControllerState["multiSelectGroup"],
		});
		expect(getSelectedLockAspectRatio(s, registries)).toBe(true);
	});

	it("false when multiSelectGroup has no lockAspectRatio", () => {
		const s = state({
			multiSelectGroup: {} as CanvasControllerState["multiSelectGroup"],
		});
		expect(getSelectedLockAspectRatio(s, registries)).toBe(false);
	});
});
