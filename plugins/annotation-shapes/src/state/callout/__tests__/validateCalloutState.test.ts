import { describe, expect, it } from "vitest";

import { calloutDefinition } from "../../../definitions";
import type { CalloutDoc } from "../../../schema/callout/CalloutDoc";
import { CALLOUT_DOC_DEFAULTS } from "../../../schema/callout/CalloutDoc";

const { toState: calloutToState } = calloutDefinition.mapper;
const isValidCalloutState = calloutDefinition.stateValidator;

// Colours are overridden with the "auto" sentinel: the shipped defaults carry real
// colours, which reach isCssColor (CSS.supports) — the node test environment has no
// CSS. That the defaults are valid colours is covered by the canvas paste e2e.
const baseState = {
	...calloutToState({
		...CALLOUT_DOC_DEFAULTS,
		id: "callout-1",
	} as CalloutDoc),
	stroke: "auto",
	fill: "auto",
};

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
