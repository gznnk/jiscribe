import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { commitEdit, commitEditIfChanged } from "../commitEdit";

const makeState = (commitVersion: number): CanvasControllerState =>
	({ commitVersion, objectMenuOpenId: "a" }) as CanvasControllerState;

describe("commitEdit", () => {
	it("advances commitVersion by one without touching the rest", () => {
		const state = makeState(3);

		const committed = commitEdit(state);

		expect(committed.commitVersion).toBe(4);
		expect(committed.objectMenuOpenId).toBe("a");
		expect(state.commitVersion).toBe(3);
	});
});

describe("commitEditIfChanged", () => {
	it("hands `state` itself back when the step returned it", () => {
		const state = makeState(3);

		expect(commitEditIfChanged(state, state)).toBe(state);
	});

	it("commits the result when the step returned anything else", () => {
		const state = makeState(3);
		const result = { ...state, objectMenuOpenId: null };

		const committed = commitEditIfChanged(state, result);

		expect(committed.commitVersion).toBe(4);
		expect(committed.objectMenuOpenId).toBeNull();
	});

	it("commits a structurally equal copy, since identity is the signal", () => {
		const state = makeState(3);

		expect(commitEditIfChanged(state, { ...state }).commitVersion).toBe(4);
	});
});
