import { describe, expect, it } from "vitest";

import { isNativePointerTarget } from "../isNativePointerTarget";

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

describe("isNativePointerTarget", () => {
	it('returns true when it has data-gesture="native-pointer"', () => {
		expect(isNativePointerTarget(makeTarget(["native-pointer"]))).toBe(true);
	});

	it("returns false when it does not have the native-pointer token", () => {
		expect(isNativePointerTarget(makeTarget(["none"]))).toBe(false);
	});

	it("returns false when target is null", () => {
		expect(isNativePointerTarget(null)).toBe(false);
	});
});
