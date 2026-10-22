import { describe, expect, it } from "vitest";

import { braceDefinition, bracketDefinition } from "../../../definitions";
import { BRACE_DOC_DEFAULTS } from "../../../schema/brace/BraceDoc";
import type { BraceDoc } from "../../../schema/brace/BraceDoc";
import { BRACKET_DOC_DEFAULTS } from "../../../schema/bracket/BracketDoc";
import type { BracketDoc } from "../../../schema/bracket/BracketDoc";
import {
	isValidGroupMarkerDirection,
	isValidGroupMarkerTipFields,
} from "../isValidGroupMarkerFields";

describe("isValidGroupMarkerDirection", () => {
	it("accepts each of the four sides and an omitted direction", () => {
		for (const direction of ["left", "right", "up", "down"]) {
			expect(isValidGroupMarkerDirection({ direction })).toBe(true);
		}
		expect(isValidGroupMarkerDirection({})).toBe(true);
	});

	it("rejects a side the marker cannot face", () => {
		expect(isValidGroupMarkerDirection({ direction: "top" })).toBe(false);
		expect(isValidGroupMarkerDirection({ direction: null })).toBe(false);
	});
});

describe("isValidGroupMarkerTipFields", () => {
	it("accepts a tip position at either end of the edge and an omitted one", () => {
		expect(isValidGroupMarkerTipFields({ tipPosition: 0 })).toBe(true);
		expect(isValidGroupMarkerTipFields({ tipPosition: 1 })).toBe(true);
		expect(isValidGroupMarkerTipFields({ direction: "up" })).toBe(true);
	});

	it("rejects a tip position off the edge or not a number", () => {
		expect(isValidGroupMarkerTipFields({ tipPosition: -0.01 })).toBe(false);
		expect(isValidGroupMarkerTipFields({ tipPosition: 1.01 })).toBe(false);
		expect(isValidGroupMarkerTipFields({ tipPosition: "0.5" })).toBe(false);
	});

	it("rejects a valid tip position beside an invalid direction", () => {
		expect(
			isValidGroupMarkerTipFields({ direction: "top", tipPosition: 0.5 }),
		).toBe(false);
	});
});

/**
 * The definitions pick one or the other per type: the brace's tip moves, the
 * bracket's does not. Colours go in as the "auto" sentinel, since the node test
 * environment has no CSS to check a real one against (see validateCalloutState.test.ts).
 */
describe("the group markers' state validators", () => {
	const braceState = {
		...braceDefinition.mapper.toState({
			...BRACE_DOC_DEFAULTS,
			id: "brace-1",
		} as BraceDoc),
		stroke: "auto",
		fill: "auto",
	};
	const bracketState = {
		...bracketDefinition.mapper.toState({
			...BRACKET_DOC_DEFAULTS,
			id: "bracket-1",
		} as BracketDoc),
		stroke: "auto",
		fill: "auto",
	};

	it("accepts what the mappers produce", () => {
		expect(braceDefinition.stateValidator(braceState)).toBe(true);
		expect(bracketDefinition.stateValidator(bracketState)).toBe(true);
	});

	it("holds the brace's tip position to its edge", () => {
		expect(
			braceDefinition.stateValidator({ ...braceState, tipPosition: 2 }),
		).toBe(false);
	});

	it("holds both markers' direction to the four sides", () => {
		expect(
			braceDefinition.stateValidator({ ...braceState, direction: "top" }),
		).toBe(false);
		expect(
			bracketDefinition.stateValidator({ ...bracketState, direction: "top" }),
		).toBe(false);
	});
});
