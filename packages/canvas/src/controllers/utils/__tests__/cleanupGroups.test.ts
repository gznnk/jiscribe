import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { cleanupGroups } from "../cleanupGroups";

// 最小限の state ファクトリ
const makeState = (
	objects: Record<string, ObjectState>,
	rootIds: string[],
): CanvasControllerState =>
	({ objects, rootIds }) as unknown as CanvasControllerState;

const rect = (id: string, parentId?: string): ObjectState =>
	({ id, type: "rect", cx: 0, cy: 0, parentId }) as unknown as ObjectState;

const group = (
	id: string,
	childIds: string[],
	parentId?: string,
): ObjectState =>
	({
		id,
		type: "group",
		childIds,
		cx: 0,
		cy: 0,
		width: 0,
		height: 0,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		parentId,
	}) as unknown as ObjectState;

describe("cleanupGroups", () => {
	it("グループがない → 同一参照相当（objects/rootIds に変化なし）", () => {
		const r1 = rect("r1");
		const state = makeState({ r1 }, ["r1"]);
		const result = cleanupGroups(state);
		expect(result.objects["r1"]).toBe(r1);
		expect(result.rootIds).toEqual(["r1"]);
	});

	it("子が 2 件以上のグループ → そのまま残る", () => {
		const r1 = rect("r1", "g1");
		const r2 = rect("r2", "g1");
		const g1 = group("g1", ["r1", "r2"]);
		const state = makeState({ g1, r1, r2 }, ["g1"]);
		const result = cleanupGroups(state);
		expect(result.objects["g1"]).toBeDefined();
		expect(result.rootIds).toContain("g1");
	});

	describe("空グループ（childCount=0）", () => {
		it("ルートの空グループ → 削除される", () => {
			const g1 = group("g1", []);
			const state = makeState({ g1 }, ["g1"]);
			const result = cleanupGroups(state);
			expect(result.objects["g1"]).toBeUndefined();
			expect(result.rootIds).not.toContain("g1");
		});

		it("親グループ内の空サブグループ → サブグループのみ削除、親は残る（子が減るため再チェック対象）", () => {
			const r1 = rect("r1", "outer");
			const empty = group("empty", [], "outer");
			const outer = group("outer", ["empty", "r1"]);
			const state = makeState({ outer, empty, r1 }, ["outer"]);
			const result = cleanupGroups(state);
			expect(result.objects["empty"]).toBeUndefined();
			// outer は r1 1件のみになるので ungroup される
			expect(result.objects["outer"]).toBeUndefined();
			expect(result.rootIds).toContain("r1");
		});
	});

	describe("子が 1 件のグループ（ungroup）", () => {
		it("ルートの単子グループ → グループ削除・子がルートに昇格", () => {
			const r1 = rect("r1", "g1");
			const g1 = group("g1", ["r1"]);
			const state = makeState({ g1, r1 }, ["g1"]);
			const result = cleanupGroups(state);
			expect(result.objects["g1"]).toBeUndefined();
			expect(result.rootIds).toContain("r1");
			const updatedR1 = result.objects["r1"] as unknown as {
				parentId?: string;
			};
			expect(updatedR1.parentId).toBeUndefined();
		});

		it("親グループ内の単子サブグループ → サブグループ削除・子が親グループに移動", () => {
			const r1 = rect("r1", "inner");
			const r2 = rect("r2", "outer");
			const inner = group("inner", ["r1"], "outer");
			const outer = group("outer", ["inner", "r2"]);
			const state = makeState({ outer, inner, r1, r2 }, ["outer"]);
			const result = cleanupGroups(state);
			expect(result.objects["inner"]).toBeUndefined();
			const updatedOuter = result.objects["outer"] as unknown as {
				childIds: string[];
			};
			expect(updatedOuter.childIds).toContain("r1");
			expect(updatedOuter.childIds).not.toContain("inner");
			const updatedR1 = result.objects["r1"] as unknown as {
				parentId?: string;
			};
			expect(updatedR1.parentId).toBe("outer");
		});
	});

	describe("ネスト連鎖（複数回クリーンアップが必要なケース）", () => {
		it("空グループを含む単子グループ → 両方削除される", () => {
			// outer(1子=inner) → inner(0子) → inner 削除 → outer 0子 → outer も削除
			const inner = group("inner", [], "outer");
			const outer = group("outer", ["inner"]);
			const state = makeState({ outer, inner }, ["outer"]);
			const result = cleanupGroups(state);
			expect(result.objects["inner"]).toBeUndefined();
			expect(result.objects["outer"]).toBeUndefined();
			expect(result.rootIds).toHaveLength(0);
		});
	});
});
