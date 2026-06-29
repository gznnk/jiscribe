import { describe, it, expect } from "vitest";

import type { CanvasControllerState } from "../../CanvasTypes";
import { commitTextEditIfNeeded } from "../commitTextEditIfNeeded";

type MinState = Pick<
	CanvasControllerState,
	"textEditState" | "objects" | "commitVersion"
>;

const makeState = (overrides: Partial<MinState> = {}): CanvasControllerState =>
	({
		textEditState: null,
		objects: {},
		commitVersion: 0,
		...overrides,
	}) as unknown as CanvasControllerState;

// テキストプロパティを持つオブジェクト（isTextStyleState を通過する）
const textObj = (id: string, text: string) =>
	({ id, type: "rect", text }) as unknown;

describe("commitTextEditIfNeeded", () => {
	it("textEditState が null → 同一参照を返す", () => {
		const state = makeState({ textEditState: null });
		expect(commitTextEditIfNeeded(state)).toBe(state);
	});

	it("textEditState がある → 対象オブジェクトが存在しない → textEditState をクリアして返す", () => {
		const state = makeState({
			textEditState: { objectId: "missing", text: "hello" },
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(0); // コミットバージョンは変化しない
	});

	it("textEditState がある → 対象オブジェクトの text が数値（isTextStyleState を通過しない）→ textEditState をクリア", () => {
		// isTextStyleState は text: string でなければ false を返す
		const invalidTextObj = { id: "r1", type: "rect", text: 123 };
		const state = makeState({
			objects: {
				r1: invalidTextObj as unknown as CanvasControllerState["objects"][string],
			},
			textEditState: { objectId: "r1", text: "hello" },
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(0);
	});

	it("text が変化していない → textEditState をクリアするが commitVersion は増えない", () => {
		const obj = textObj("r1", "same text");
		const state = makeState({
			objects: { r1: obj as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "r1", text: "same text" },
			commitVersion: 5,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(5);
	});

	it("text が変化している → テキストを更新し commitVersion をインクリメント", () => {
		const obj = textObj("r1", "old text");
		const state = makeState({
			objects: { r1: obj as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "r1", text: "new text" },
			commitVersion: 3,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(4);
		const updatedObj = result.objects["r1"] as unknown as { text: string };
		expect(updatedObj.text).toBe("new text");
	});

	it("text 更新時は元の objects を変更しない（イミュータブル）", () => {
		const obj = textObj("r1", "original");
		const originalObjects = {
			r1: obj as CanvasControllerState["objects"][string],
		};
		const state = makeState({
			objects: originalObjects,
			textEditState: { objectId: "r1", text: "updated" },
		});
		commitTextEditIfNeeded(state);
		const originalObj = originalObjects["r1"] as unknown as { text: string };
		expect(originalObj.text).toBe("original");
	});

	// ─── コネクターラベル（label.text） ───
	const connectorObj = (id: string, label?: { text: string }) =>
		({ id, type: "connector", ...(label ? { label } : {}) }) as unknown;

	it("コネクター: ラベル未設定から text を入力 → label.text を作成しコミット", () => {
		const c = connectorObj("c1");
		const state = makeState({
			objects: { c1: c as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "c1", text: "Yes" },
			commitVersion: 1,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(2);
		const updated = result.objects["c1"] as unknown as {
			label?: { text: string };
		};
		expect(updated.label?.text).toBe("Yes");
	});

	it("コネクター: 既存ラベルを空文字でコミット → label を取り除く", () => {
		const c = connectorObj("c1", { text: "Yes" });
		const state = makeState({
			objects: { c1: c as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "c1", text: "" },
			commitVersion: 1,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.commitVersion).toBe(2);
		const updated = result.objects["c1"] as unknown as {
			label?: { text: string };
		};
		expect(updated.label).toBeUndefined();
	});

	it("コネクター: ラベルが変化していない → commitVersion は増えない", () => {
		const c = connectorObj("c1", { text: "Yes" });
		const state = makeState({
			objects: { c1: c as CanvasControllerState["objects"][string] },
			textEditState: { objectId: "c1", text: "Yes" },
			commitVersion: 7,
		});
		const result = commitTextEditIfNeeded(state);
		expect(result.textEditState).toBeNull();
		expect(result.commitVersion).toBe(7);
	});
});
