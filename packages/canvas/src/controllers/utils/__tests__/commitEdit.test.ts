import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { commitEdit } from "../commitEdit";

const makeState = (commitVersion: number): CanvasControllerState =>
	({ commitVersion, edgeScrollEnabled: true }) as CanvasControllerState;

describe("commitEdit", () => {
	it("advances commitVersion by one without touching the rest", () => {
		const state = makeState(3);

		const committed = commitEdit(state);

		expect(committed.commitVersion).toBe(4);
		expect(committed.edgeScrollEnabled).toBe(true);
		expect(state.commitVersion).toBe(3);
	});
});
