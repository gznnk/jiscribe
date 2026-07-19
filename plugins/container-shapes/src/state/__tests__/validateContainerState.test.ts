import { describe, expect, it } from "vitest";

import type { ContainerDoc } from "../../schema/ContainerDoc";
import { CONTAINER_DOC_DEFAULTS } from "../../schema/ContainerDoc";
import { containerToState } from "../ContainerMapper";
import { isValidContainerState } from "../validateContainerState";

const baseState = containerToState({
	...CONTAINER_DOC_DEFAULTS,
	id: "container-1",
} as ContainerDoc);

describe("isValidContainerState - headerHeight", () => {
	it("accepts a state without headerHeight", () => {
		expect(isValidContainerState(baseState)).toBe(true);
	});

	it("accepts headerHeight >= 1 (same bound as the doc validator / schema)", () => {
		expect(isValidContainerState({ ...baseState, headerHeight: 1 })).toBe(true);
		expect(isValidContainerState({ ...baseState, headerHeight: 28 })).toBe(
			true,
		);
	});

	it("rejects headerHeight below 1 or non-numeric", () => {
		expect(isValidContainerState({ ...baseState, headerHeight: 0.5 })).toBe(
			false,
		);
		expect(isValidContainerState({ ...baseState, headerHeight: 0 })).toBe(
			false,
		);
		expect(isValidContainerState({ ...baseState, headerHeight: "28" })).toBe(
			false,
		);
	});
});
