import type { CanvasDoc } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { createCanvasOpHistory } from "../canvasOpHistory";

/** 中身の違いだけが分かればよいので、id 1 個の doc を並べて手を表す */
const docWith = (...ids: string[]): CanvasDoc =>
	({
		version: 1,
		root: ids.map((id) => ({ id, type: "rect", x: 0, y: 0 })),
	}) as unknown as CanvasDoc;

describe("createCanvasOpHistory", () => {
	it("直前の 1 手ぶん、操作前の doc を返す", () => {
		const history = createCanvasOpHistory();
		const before = docWith();
		const after = docWith("rect-1");
		history.push(before, after);

		expect(history.pop(after)).toBe(before);
		expect(history.depth()).toBe(0);
	});

	it("何も積まれていなければ null を返す", () => {
		expect(createCanvasOpHistory().pop(docWith())).toBeNull();
	});

	it("積んだ順の逆に戻していける", () => {
		const history = createCanvasOpHistory();
		const [empty, one, two] = [
			docWith(),
			docWith("rect-1"),
			docWith("rect-1", "rect-2"),
		];
		history.push(empty, one);
		history.push(one, two);

		expect(history.pop(two)).toBe(one);
		expect(history.pop(one)).toBe(empty);
		expect(history.depth()).toBe(0);
	});

	it("AI が置いたあとにユーザーが編集していたら戻さない", () => {
		const history = createCanvasOpHistory();
		history.push(docWith(), docWith("rect-1"));

		// ユーザーが図形を足した doc。AI の手だけを戻すと、この追加まで消えてしまう
		expect(history.pop(docWith("rect-1", "rect-2"))).toBeNull();
		// 判断材料として履歴は残す（呼び出し元が「履歴切れ」と区別できるように）
		expect(history.depth()).toBe(1);
	});

	it("同じ中身なら実体が違っても戻せる（doc は毎回作り直される）", () => {
		const history = createCanvasOpHistory();
		const before = docWith();
		history.push(before, docWith("rect-1"));

		expect(history.pop(docWith("rect-1"))).toBe(before);
	});

	it("上限を超えたら古い手から捨てる", () => {
		const history = createCanvasOpHistory();
		const ids: string[] = [];
		for (let step = 0; step < 25; step += 1) {
			const before = docWith(...ids);
			ids.push(`rect-${step}`);
			history.push(before, docWith(...ids));
		}

		expect(history.depth()).toBe(20);
	});
});
