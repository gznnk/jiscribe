import { describe, expect, it } from "vitest";

import { findGestureElement } from "../findGestureElement";

/**
 * Create an EventTarget mimicking an element with a set of data-gesture tokens.
 * closest interprets selectors of the form [data-gesture~="token"] and returns
 * itself if the token is included in tokens.
 */
const makeTarget = (tokens: string[]): EventTarget => {
	const el = {
		closest: (selector: string) => {
			const match = selector.match(/^\[data-gesture~="(.+)"\]$/);
			if (match && tokens.includes(match[1])) {
				return el;
			}
			return null;
		},
	};
	return el as unknown as EventTarget;
};

describe("findGestureElement", () => {
	it("returns null when target is null", () => {
		expect(findGestureElement(null, "none")).toBeNull();
	});

	it("returns null when target has no closest (e.g. document)", () => {
		expect(findGestureElement({} as EventTarget, "none")).toBeNull();
	});

	it("returns the element when it has the specified token", () => {
		const target = makeTarget(["none"]);
		expect(findGestureElement(target, "none")).toBe(target);
	});

	it("returns null when it does not have the specified token", () => {
		const target = makeTarget(["native-wheel"]);
		expect(findGestureElement(target, "none")).toBeNull();
	});

	it("finds the matching one among multiple tokens", () => {
		const target = makeTarget(["none", "native-wheel"]);
		expect(findGestureElement(target, "native-wheel")).toBe(target);
	});
});
