import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { RectState } from "../../../states/objects/primitives/rect/RectState";
import { collectDescendantIds } from "../collectDescendantIds";

// テスト用のオブジェクトマップ型
type Objects = Record<string, ObjectState>;

const rect = (id: string, parentId?: string): RectState =>
	({ id, type: "rect", parentId }) as RectState;

const group = (id: string, childIds: string[], parentId?: string): GroupState =>
	({ id, type: "group", childIds, parentId }) as unknown as GroupState;

describe("collectDescendantIds", () => {
	// ─── 基本ケース ────────────────────────────────────────────────

	it("グループでないオブジェクトの場合は空配列を返す", () => {
		const objects: Objects = { "rect-1": rect("rect-1") };
		expect(collectDescendantIds("rect-1", objects)).toEqual([]);
	});

	it("存在しないIDの場合は空配列を返す", () => {
		expect(collectDescendantIds("nonexistent", {})).toEqual([]);
	});

	it("childIds が空のグループは空配列を返す", () => {
		const objects: Objects = { "group-1": group("group-1", []) };
		expect(collectDescendantIds("group-1", objects)).toEqual([]);
	});

	it("直接の子（非グループ）を返す", () => {
		const objects: Objects = {
			"group-1": group("group-1", ["rect-1", "rect-2"]),
			"rect-1": rect("rect-1", "group-1"),
			"rect-2": rect("rect-2", "group-1"),
		};
		const result = collectDescendantIds("group-1", objects);
		expect(result).toContain("rect-1");
		expect(result).toContain("rect-2");
		expect(result).toHaveLength(2);
	});

	// ─── ネスト ────────────────────────────────────────────────────

	it("2階層のネストでグループと非グループの子孫をすべて返す", () => {
		const objects: Objects = {
			"group-1": group("group-1", ["group-2", "rect-1"]),
			"group-2": group("group-2", ["rect-2", "rect-3"], "group-1"),
			"rect-1": rect("rect-1", "group-1"),
			"rect-2": rect("rect-2", "group-2"),
			"rect-3": rect("rect-3", "group-2"),
		};
		const result = collectDescendantIds("group-1", objects);
		expect(result).toContain("group-2");
		expect(result).toContain("rect-1");
		expect(result).toContain("rect-2");
		expect(result).toContain("rect-3");
		expect(result).toHaveLength(4);
	});

	it("3階層のネストでも全子孫を返す", () => {
		const objects: Objects = {
			g1: group("g1", ["g2"]),
			g2: group("g2", ["g3"], "g1"),
			g3: group("g3", ["rect-1"], "g2"),
			"rect-1": rect("rect-1", "g3"),
		};
		const result = collectDescendantIds("g1", objects);
		expect(result).toContain("g2");
		expect(result).toContain("g3");
		expect(result).toContain("rect-1");
		expect(result).toHaveLength(3);
	});

	it("ルートIDは結果に含まれない", () => {
		const objects: Objects = {
			"group-1": group("group-1", ["rect-1"]),
			"rect-1": rect("rect-1", "group-1"),
		};
		const result = collectDescendantIds("group-1", objects);
		expect(result).not.toContain("group-1");
	});

	// ─── accumulator ──────────────────────────────────────────────

	it("既存の result 配列を渡すと追記される（API互換性）", () => {
		const objects: Objects = {
			"group-1": group("group-1", ["rect-2"]),
			"rect-2": rect("rect-2", "group-1"),
		};
		const existing = ["rect-1"];
		const result = collectDescendantIds("group-1", objects, existing);
		expect(result).toEqual(["rect-1", "rect-2"]);
		expect(result).toBe(existing); // 同じ配列の参照を返す
	});
});
