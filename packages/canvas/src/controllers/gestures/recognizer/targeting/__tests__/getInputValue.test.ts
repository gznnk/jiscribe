import { describe, expect, it } from "vitest";

import { getInputValue, readInputValue } from "../getInputValue";

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
	it("returns the value of a native-pointer element", () => {
		const target = makeTarget({ tokens: ["native-pointer"], value: "42" });
		expect(getInputValue(target)).toBe("42");
	});

	it("returns undefined when it lacks the native-pointer token", () => {
		const target = makeTarget({ tokens: ["none"], value: "42" });
		expect(getInputValue(target)).toBeUndefined();
	});

	it("returns undefined for an element without a value", () => {
		const target = makeTarget({ tokens: ["native-pointer"] });
		expect(getInputValue(target)).toBeUndefined();
	});

	it("returns undefined when target is null", () => {
		expect(getInputValue(null)).toBeUndefined();
	});
});

describe("readInputValue", () => {
	it("reads the value without checking the native-pointer qualification", () => {
		// No data-gesture token: getInputValue rejects, readInputValue reads anyway
		// (the qualification is fixed at pointerdown by the caller)
		const target = makeTarget({ tokens: [], value: "42" });
		expect(readInputValue(target)).toBe("42");
	});

	it("returns undefined for an element without a string value", () => {
		const target = makeTarget({ tokens: ["native-pointer"] });
		expect(readInputValue(target)).toBeUndefined();
	});

	it("returns undefined when target is null", () => {
		expect(readInputValue(null)).toBeUndefined();
	});
});
