import { describe, expect, it } from "vitest";

import { findGestureElement } from "../findGestureElement";

/**
 * data-gesture のトークン集合を持つ要素を模した EventTarget を作る。
 * closest は [data-gesture~="token"] 形式のセレクタを解釈し、
 * tokens に該当トークンが含まれていれば自身を返す。
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
	it("target が null のとき null を返す", () => {
		expect(findGestureElement(null, "none")).toBeNull();
	});

	it("closest を持たない target（document など）のとき null を返す", () => {
		expect(findGestureElement({} as EventTarget, "none")).toBeNull();
	});

	it("指定トークンを持つとき要素を返す", () => {
		const target = makeTarget(["none"]);
		expect(findGestureElement(target, "none")).toBe(target);
	});

	it("指定トークンを持たないとき null を返す", () => {
		const target = makeTarget(["native-wheel"]);
		expect(findGestureElement(target, "none")).toBeNull();
	});

	it("複数トークンのうち該当するものを見つける", () => {
		const target = makeTarget(["none", "native-wheel"]);
		expect(findGestureElement(target, "native-wheel")).toBe(target);
	});
});
