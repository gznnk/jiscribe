import { describe, expect, it } from "vitest";

import { rectToDoc, rectToState } from "../../primitives/rect/RectMapper";
import type { RectState } from "../../primitives/rect/RectState";

/**
 * pass-through 方式の回帰テスト。
 * createFrameMapper は features 由来のスタイルキー＋extra キーだけを allow-list で
 * 拾う。CanvasMapper が全 State に付与する runtime 専用の parentId や、State 専用の
 * minWidth/minHeight は allow-list に含まれないため、Doc（階層は children で表現する
 * nested tree）へ漏れないことを保証する。逆に rect の角丸 rx は radius スタイルとして
 * allow-list に含まれるため往復で保持されることも固定する。
 */
describe("FrameMapper pass-through: runtime 専用フィールドを Doc に漏らさない", () => {
	it("rect の角丸 rx（radius スタイル）は doc↔state を往復しても保持される", () => {
		const doc = {
			id: "rect-1",
			type: "rect",
			x: 0,
			y: 0,
			width: 100,
			height: 100,
			rx: 12,
		} as unknown as Parameters<typeof rectToState>[0];

		const state = rectToState(doc) as Record<string, unknown>;
		expect(state.rx).toBe(12);

		const roundTripped = rectToDoc(state as never) as Record<string, unknown>;
		expect(roundTripped.rx).toBe(12);
	});

	it("rectToDoc は parentId を Doc に含めない", () => {
		const state = {
			id: "rect-1",
			type: "rect",
			parentId: "group-9",
			cx: 50,
			cy: 50,
			width: 100,
			height: 100,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			fill: "#fff",
		} as unknown as RectState;

		const doc = rectToDoc(state) as Record<string, unknown>;

		expect("parentId" in doc).toBe(false);
	});

	it("rectToDoc は State 専用の minWidth/minHeight を Doc に含めない", () => {
		const state = {
			id: "rect-1",
			type: "rect",
			cx: 50,
			cy: 50,
			width: 100,
			height: 100,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			minWidth: 20,
			minHeight: 10,
		} as unknown as RectState;

		const doc = rectToDoc(state) as Record<string, unknown>;

		expect("minWidth" in doc).toBe(false);
		expect("minHeight" in doc).toBe(false);
	});
});
