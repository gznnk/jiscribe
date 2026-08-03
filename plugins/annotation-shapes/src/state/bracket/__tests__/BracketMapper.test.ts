import { describe, expect, it } from "vitest";

import { BRACKET_DOC_DEFAULTS } from "../../../schema/bracket/BracketDoc";
import { bracketToState } from "../BracketMapper";

describe("bracketToState", () => {
	/**
	 * The counterpart of validateBracketDoc's silence: the mapper picks fields off
	 * an allow-list, so a tipPosition written onto a bracket never reaches the
	 * state and cannot quietly steer the label.
	 */
	it("drops a tipPosition the bracket does not declare", () => {
		const state = bracketToState({
			...BRACKET_DOC_DEFAULTS,
			id: "bracket-1",
			tipPosition: 0.25,
		} as Parameters<typeof bracketToState>[0]);
		expect("tipPosition" in state).toBe(false);
		expect(state.direction).toBe("left");
	});
});
