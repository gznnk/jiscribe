import { describe, expect, it } from "vitest";

import type { CalloutDoc } from "../../../schema/callout/CalloutDoc";
import { CALLOUT_DOC_DEFAULTS } from "../../../schema/callout/CalloutDoc";
import { calloutToState } from "../CalloutMapper";
import { isValidCalloutState } from "../validateCalloutState";

const baseState = calloutToState({
	...CALLOUT_DOC_DEFAULTS,
	id: "callout-1",
} as CalloutDoc);

describe("isValidCalloutState - tail", () => {
	it("accepts a state without tail", () => {
		expect(isValidCalloutState(baseState)).toBe(true);
	});

	it("accepts a valid tail", () => {
		expect(
			isValidCalloutState({
				...baseState,
				tail: { side: "right", position: 0.5 },
			}),
		).toBe(true);
		expect(
			isValidCalloutState({
				...baseState,
				tail: { side: "top", position: 0 },
			}),
		).toBe(true);
	});

	it("rejects an invalid side, out-of-range position, or non-object tail", () => {
		expect(
			isValidCalloutState({
				...baseState,
				tail: { side: "diagonal", position: 0.5 },
			}),
		).toBe(false);
		expect(
			isValidCalloutState({
				...baseState,
				tail: { side: "bottom", position: 1.5 },
			}),
		).toBe(false);
		expect(isValidCalloutState({ ...baseState, tail: "bottom" })).toBe(false);
	});
});
