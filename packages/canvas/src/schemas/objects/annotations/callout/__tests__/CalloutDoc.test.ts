import { describe, it, expect } from "vitest";

import {
	CALLOUT_TAIL_DEFAULT,
	CALLOUT_TAIL_SIDES,
	isCalloutTail,
	isCalloutTailSide,
} from "../CalloutDoc";

describe("isCalloutTailSide", () => {
	it("accepts every declared side", () => {
		for (const side of CALLOUT_TAIL_SIDES) {
			expect(isCalloutTailSide(side)).toBe(true);
		}
	});

	it("rejects anything else", () => {
		expect(isCalloutTailSide("center")).toBe(false);
		expect(isCalloutTailSide("TOP")).toBe(false);
		expect(isCalloutTailSide(0)).toBe(false);
		expect(isCalloutTailSide(undefined)).toBe(false);
	});
});

describe("isCalloutTail", () => {
	it("accepts the default tail", () => {
		expect(isCalloutTail(CALLOUT_TAIL_DEFAULT)).toBe(true);
	});

	it("accepts the inclusive bounds of position", () => {
		expect(isCalloutTail({ side: "top", position: 0 })).toBe(true);
		expect(isCalloutTail({ side: "top", position: 1 })).toBe(true);
	});

	it("rejects a position outside 0..1", () => {
		expect(isCalloutTail({ side: "top", position: -0.01 })).toBe(false);
		expect(isCalloutTail({ side: "top", position: 1.01 })).toBe(false);
	});

	it("rejects a non-numeric position and an unknown side", () => {
		expect(isCalloutTail({ side: "top", position: "0.5" })).toBe(false);
		expect(isCalloutTail({ side: "center", position: 0.5 })).toBe(false);
		expect(isCalloutTail({ side: "top" })).toBe(false);
	});

	it("rejects non-objects", () => {
		expect(isCalloutTail(null)).toBe(false);
		expect(isCalloutTail(undefined)).toBe(false);
		expect(isCalloutTail("bottom")).toBe(false);
		expect(isCalloutTail(["bottom", 0.2])).toBe(false);
	});
});
