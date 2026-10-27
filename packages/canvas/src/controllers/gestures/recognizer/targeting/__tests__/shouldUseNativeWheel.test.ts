import { describe, expect, it } from "vitest";

import { shouldUseNativeWheel } from "../shouldUseNativeWheel";

const makeTarget = (params: {
	hasNativeWheelAncestor: boolean;
	hasChromeWheelAncestor?: boolean;
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
			if (
				selector === '[data-gesture~="chrome-wheel"]' &&
				params.hasChromeWheelAncestor === true
			) {
				return scrollableEl;
			}
			return null;
		},
	} as unknown as EventTarget;
};

describe("shouldUseNativeWheel", () => {
	it("returns false while Ctrl is held (zoom operation) even when scrollable", () => {
		const target = makeTarget({
			hasNativeWheelAncestor: true,
			scrollHeight: 200,
			clientHeight: 100,
		});
		expect(shouldUseNativeWheel(target, true)).toBe(false);
	});

	it("returns false when target is null", () => {
		expect(shouldUseNativeWheel(null, false)).toBe(false);
	});

	it("returns false for a target without closest (such as document)", () => {
		expect(shouldUseNativeWheel({} as EventTarget, false)).toBe(false);
	});

	it("returns false when outside a native-wheel element", () => {
		const target = makeTarget({ hasNativeWheelAncestor: false });
		expect(shouldUseNativeWheel(target, false)).toBe(false);
	});

	it("returns false when inside a native-wheel element but the content does not overflow", () => {
		const target = makeTarget({
			hasNativeWheelAncestor: true,
			scrollHeight: 100,
			clientHeight: 100,
		});
		expect(shouldUseNativeWheel(target, false)).toBe(false);
	});

	it("returns true when inside a native-wheel element and the content overflows", () => {
		const target = makeTarget({
			hasNativeWheelAncestor: true,
			scrollHeight: 200,
			clientHeight: 100,
		});
		expect(shouldUseNativeWheel(target, false)).toBe(true);
	});

	it.each([false, true])(
		"returns true inside a chrome-wheel element, not scrollable, with Ctrl held %s",
		(ctrlKey) => {
			const target = makeTarget({
				hasNativeWheelAncestor: false,
				hasChromeWheelAncestor: true,
			});
			expect(shouldUseNativeWheel(target, ctrlKey)).toBe(true);
		},
	);
});
