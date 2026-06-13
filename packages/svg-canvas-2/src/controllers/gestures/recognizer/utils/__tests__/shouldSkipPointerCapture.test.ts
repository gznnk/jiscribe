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
	it('data-gesture="native-pointer" を持つとき true を返す', () => {
		expect(shouldSkipPointerCapture(makeTarget(["native-pointer"]))).toBe(true);
	});

	it("native-pointer トークンを持たないとき false を返す", () => {
		expect(shouldSkipPointerCapture(makeTarget(["none"]))).toBe(false);
	});

	it("target が null のとき false を返す", () => {
		expect(shouldSkipPointerCapture(null)).toBe(false);
	});
});
