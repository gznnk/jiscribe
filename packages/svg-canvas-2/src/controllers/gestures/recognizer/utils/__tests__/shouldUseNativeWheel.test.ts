import { describe, expect, it } from "vitest";

import { shouldUseNativeWheel } from "../shouldUseNativeWheel";

const makeTarget = (params: {
	hasNativeWheelAncestor: boolean;
	scrollHeight?: number;
	clientHeight?: number;
}): EventTarget => {
	const scrollableEl = {
		scrollHeight: params.scrollHeight ?? 0,
		clientHeight: params.clientHeight ?? 0,
	};
	return {
		closest: (selector: string) => {
			if (
				selector === '[data-gesture~="native-wheel"]' &&
				params.hasNativeWheelAncestor
			) {
				return scrollableEl;
			}
			return null;
		},
	} as unknown as EventTarget;
};

describe("shouldUseNativeWheel", () => {
	it("Ctrl 押下時（ズーム操作）はスクロール可能でも false を返す", () => {
		const target = makeTarget({
			hasNativeWheelAncestor: true,
			scrollHeight: 200,
			clientHeight: 100,
		});
		expect(shouldUseNativeWheel(target, true)).toBe(false);
	});

	it("target が null のとき false を返す", () => {
		expect(shouldUseNativeWheel(null, false)).toBe(false);
	});

	it("closest を持たない target（document など）のとき false を返す", () => {
		expect(shouldUseNativeWheel({} as EventTarget, false)).toBe(false);
	});

	it("native-wheel 要素の外側のとき false を返す", () => {
		const target = makeTarget({ hasNativeWheelAncestor: false });
		expect(shouldUseNativeWheel(target, false)).toBe(false);
	});

	it("native-wheel 要素内でも内容があふれていないとき false を返す", () => {
		const target = makeTarget({
			hasNativeWheelAncestor: true,
			scrollHeight: 100,
			clientHeight: 100,
		});
		expect(shouldUseNativeWheel(target, false)).toBe(false);
	});

	it("native-wheel 要素内で内容があふれているとき true を返す", () => {
		const target = makeTarget({
			hasNativeWheelAncestor: true,
			scrollHeight: 200,
			clientHeight: 100,
		});
		expect(shouldUseNativeWheel(target, false)).toBe(true);
	});
});
