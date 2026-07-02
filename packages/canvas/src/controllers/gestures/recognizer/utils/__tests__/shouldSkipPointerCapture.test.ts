import { describe, expect, it } from "vitest";

import { shouldSkipPointerCapture } from "../shouldSkipPointerCapture";

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

describe("shouldSkipPointerCapture", () => {
	it('returns true when it has data-gesture="native-pointer"', () => {
		expect(shouldSkipPointerCapture(makeTarget(["native-pointer"]))).toBe(true);
	});

	it("returns false when it does not have the native-pointer token", () => {
		expect(shouldSkipPointerCapture(makeTarget(["none"]))).toBe(false);
	});

	it("returns false when target is null", () => {
		expect(shouldSkipPointerCapture(null)).toBe(false);
	});
});
