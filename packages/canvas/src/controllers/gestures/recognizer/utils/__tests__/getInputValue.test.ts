import { describe, expect, it } from "vitest";

import { getInputValue } from "../getInputValue";

const makeTarget = (params: {
	tokens: string[];
	value?: string;
}): EventTarget => {
	const el = {
		value: params.value,
		closest: (selector: string) => {
			const match = selector.match(/^\[data-gesture~="(.+)"\]$/);
			if (match && params.tokens.includes(match[1])) {
				return el;
			}
			return null;
		},
	};
	return el as unknown as EventTarget;
};

describe("getInputValue", () => {
	it("native-pointer 要素の value を返す", () => {
		const target = makeTarget({ tokens: ["native-pointer"], value: "42" });
		expect(getInputValue(target)).toBe("42");
	});

	it("native-pointer トークンを持たないとき undefined を返す", () => {
		const target = makeTarget({ tokens: ["none"], value: "42" });
		expect(getInputValue(target)).toBeUndefined();
	});

	it("value を持たない要素のとき undefined を返す", () => {
		const target = makeTarget({ tokens: ["native-pointer"] });
		expect(getInputValue(target)).toBeUndefined();
	});

	it("target が null のとき undefined を返す", () => {
		expect(getInputValue(null)).toBeUndefined();
	});
});
