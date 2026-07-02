import { describe, expect, it } from "vitest";

import { isGestureOptedOut } from "../isGestureOptedOut";

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

describe("isGestureOptedOut", () => {
	it('returns true when it has data-gesture="none"', () => {
		expect(isGestureOptedOut(makeTarget(["none"]))).toBe(true);
	});

	it("returns false when it does not have the none token", () => {
		expect(isGestureOptedOut(makeTarget(["native-pointer"]))).toBe(false);
	});

	it("returns false when target is null", () => {
		expect(isGestureOptedOut(null)).toBe(false);
	});
});
