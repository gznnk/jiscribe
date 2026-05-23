import { describe, it, expect } from "vitest";

import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { RectState } from "../../../states/objects/primitives/rect/RectState";
import { findLowestCommonAncestor } from "../findLowestCommonAncestor";

type Objects = Record<string, GroupState | RectState>;

const rect = (id: string, parentId?: string): RectState =>
	({ id, type: "rect", parentId } as RectState);

const group = (id: string, childIds: string[], parentId?: string): GroupState =>
	({ id, type: "group", childIds, parentId } as unknown as GroupState);

describe("findLowestCommonAncestor", () => {
	// ─── 共通祖先なし（root 兄弟同士） ────────────────────────────────

	it("ルートレベルの兄弟同士には共通祖先がない", () => {
		const objects: Objects = {
			"rect-1": rect("rect-1"),
			"rect-2": rect("rect-2"),
		};
		expect(findLowestCommonAncestor(["rect-1", "rect-2"], objects)).toBeUndefined();
	});

	it("空配列を渡すと undefined を返す", () => {
		expect(findLowestCommonAncestor([], {})).toBeUndefined();
	});

	// ─── 同一グループ内の兄弟 ─────────────────────────────────────────

	it("同一グループ内の兄弟の LCA はそのグループ", () => {
		const objects: Objects = {
			"group-1": group("group-1", ["rect-1", "rect-2"]),
			"rect-1": rect("rect-1", "group-1"),
			"rect-2": rect("rect-2", "group-1"),
		};
		expect(findLowestCommonAncestor(["rect-1", "rect-2"], objects)).toBe("group-1");
	});

	// ─── 異なる深さ ────────────────────────────────────────────────────

	it("子と孫の LCA は共通の親グループ", () => {
		// group-1
		//   ├─ rect-1
		//   └─ group-2
		//       └─ rect-2
		const objects: Objects = {
			"group-1": group("group-1", ["rect-1", "group-2"]),
			"rect-1": rect("rect-1", "group-1"),
			"group-2": group("group-2", ["rect-2"], "group-1"),
			"rect-2": rect("rect-2", "group-2"),
		};
		expect(findLowestCommonAncestor(["rect-1", "rect-2"], objects)).toBe("group-1");
	});

	it("異なるサブグループ内の要素の LCA は共通の祖先グループ", () => {
		// group-outer
		//   ├─ group-a
		//   │   └─ rect-a
		//   └─ group-b
		//       └─ rect-b
		const objects: Objects = {
			"group-outer": group("group-outer", ["group-a", "group-b"]),
			"group-a": group("group-a", ["rect-a"], "group-outer"),
			"rect-a": rect("rect-a", "group-a"),
			"group-b": group("group-b", ["rect-b"], "group-outer"),
			"rect-b": rect("rect-b", "group-b"),
		};
		expect(findLowestCommonAncestor(["rect-a", "rect-b"], objects)).toBe("group-outer");
	});

	// ─── 片方が LCA 自身 ───────────────────────────────────────────────

	it("グループとその内部の要素の LCA はそのグループの親", () => {
		// group-outer
		//   └─ group-1
		//       └─ rect-1
		const objects: Objects = {
			"group-outer": group("group-outer", ["group-1"]),
			"group-1": group("group-1", ["rect-1"], "group-outer"),
			"rect-1": rect("rect-1", "group-1"),
		};
		// group-1 と rect-1（group-1の子）の LCA は group-outer
		expect(findLowestCommonAncestor(["group-1", "rect-1"], objects)).toBe("group-outer");
	});

	// ─── 3つ以上の要素 ────────────────────────────────────────────────

	it("3つの要素の LCA を返す", () => {
		// group-1
		//   ├─ rect-1
		//   ├─ rect-2
		//   └─ rect-3
		const objects: Objects = {
			"group-1": group("group-1", ["rect-1", "rect-2", "rect-3"]),
			"rect-1": rect("rect-1", "group-1"),
			"rect-2": rect("rect-2", "group-1"),
			"rect-3": rect("rect-3", "group-1"),
		};
		expect(findLowestCommonAncestor(["rect-1", "rect-2", "rect-3"], objects)).toBe("group-1");
	});

	it("3階層ネストで最深の共通祖先を返す", () => {
		// group-root
		//   └─ group-mid
		//       ├─ rect-1
		//       └─ rect-2
		const objects: Objects = {
			"group-root": group("group-root", ["group-mid"]),
			"group-mid": group("group-mid", ["rect-1", "rect-2"], "group-root"),
			"rect-1": rect("rect-1", "group-mid"),
			"rect-2": rect("rect-2", "group-mid"),
		};
		// LCA は group-root ではなく group-mid（より深い共通祖先）
		expect(findLowestCommonAncestor(["rect-1", "rect-2"], objects)).toBe("group-mid");
	});

	it("片方がルートレベル、もう片方がグループ内だと共通祖先なし", () => {
		const objects: Objects = {
			"group-1": group("group-1", ["rect-1"]),
			"rect-1": rect("rect-1", "group-1"),
			"rect-2": rect("rect-2"),
		};
		expect(findLowestCommonAncestor(["rect-1", "rect-2"], objects)).toBeUndefined();
	});
});
