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
	it('data-gesture="none" を持つとき true を返す', () => {
		expect(isGestureOptedOut(makeTarget(["none"]))).toBe(true);
	});

	it("none トークンを持たないとき false を返す", () => {
		expect(isGestureOptedOut(makeTarget(["native-pointer"]))).toBe(false);
	});

	it("target が null のとき false を返す", () => {
		expect(isGestureOptedOut(null)).toBe(false);
	});
});
