import { describe, expect, it } from "vitest";

import { stickyToState } from "../../annotations/sticky/StickyMapper";
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

/**
 * allow-list の取り込み契約（Doc→State 方向）。
 * createFrameMapper は「拾うキーを明示列挙し、それ以外は通さない」。未知フィールドや
 * features で無効なスタイル群は、たとえ doc に存在しても state へ持ち込まれないことを固定する。
 */
describe("FrameMapper allow-list: 拾うべきキー以外は State に持ち込まない", () => {
	it("doc に紛れた未知フィールドは state に出ない", () => {
		const doc = {
			id: "rect-1",
			type: "rect",
			x: 0,
			y: 0,
			width: 100,
			height: 100,
			bogusField: "should-be-dropped",
		} as unknown as Parameters<typeof rectToState>[0];

		const state = rectToState(doc) as Record<string, unknown>;

		expect("bogusField" in state).toBe(false);
	});

	it("stroke 無効な図形（sticky）は doc.stroke を state に持ち込まない", () => {
		const doc = {
			id: "sticky-1",
			type: "sticky",
			x: 0,
			y: 0,
			width: 100,
			height: 100,
			fill: "#ffff00",
			stroke: "#000000",
			strokeWidth: 4,
		} as unknown as Parameters<typeof stickyToState>[0];

		const state = stickyToState(doc) as Record<string, unknown>;

		// fill は features.fill=true なので拾い、stroke 系は features.stroke=false なので落とす。
		expect(state.fill).toBe("#ffff00");
		expect("stroke" in state).toBe(false);
		expect("strokeWidth" in state).toBe(false);
	});
});
