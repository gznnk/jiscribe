import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { cloneObjects } from "../cloneObjects";

const ZERO = { x: 0, y: 0 };

// テストでは remap ロジックに集中するため、最小限の形状で ObjectState を組み立てる。
const objects = (map: Record<string, unknown>): Record<string, ObjectState> =>
	map as Record<string, ObjectState>;

describe("cloneObjects", () => {
	it("グループの childIds と子の parentId を新 ID へ整合的にリマップする", () => {
		const { newObjects, newRootIds, idRemap } = cloneObjects(
			["G"],
			objects({
				G: { id: "G", type: "group", cx: 0, cy: 0, childIds: ["C"] },
				C: { id: "C", type: "rect", parentId: "G" },
			}),
			[],
			ZERO,
		);

		const newG = idRemap.get("G")!;
		const newC = idRemap.get("C")!;

		expect(newRootIds).toEqual([newG]);
		expect(
			(newObjects[newG] as unknown as { childIds: string[] }).childIds,
		).toEqual([newC]);
		expect(newObjects[newC].parentId).toBe(newG);
	});

	it("親が複製集合に存在しない子は parentId を破棄しルートへ昇格させる（孤児化を防ぐ）", () => {
		// C の親 EXTERNAL は allObjects に含まれず、C 自身も rootIds に含まれない。
		const { newObjects, newRootIds, idRemap } = cloneObjects(
			[],
			objects({
				C: { id: "C", type: "rect", parentId: "EXTERNAL" },
			}),
			[],
			ZERO,
		);

		const newC = idRemap.get("C")!;

		expect(newObjects[newC].parentId).toBeUndefined();
		// 孤児にならず、ルートとして到達可能になっている
		expect(newRootIds).toEqual([newC]);
	});

	it("childIds が複製集合に存在しない子を参照している場合は除外する（ダングリング参照を残さない）", () => {
		const { newObjects, idRemap } = cloneObjects(
			["G"],
			objects({
				G: { id: "G", type: "group", cx: 0, cy: 0, childIds: ["C", "MISSING"] },
				C: { id: "C", type: "rect", parentId: "G" },
			}),
			[],
			ZERO,
		);

		const newG = idRemap.get("G")!;
		const newC = idRemap.get("C")!;

		expect(
			(newObjects[newG] as unknown as { childIds: string[] }).childIds,
		).toEqual([newC]);
	});

	it("コネクター端点のオーナー ID をリマップし、親が解決できなくてもルートへは昇格させない", () => {
		const { newObjects, newRootIds, newConnectorIds, idRemap } = cloneObjects(
			["A"],
			objects({
				A: { id: "A", type: "rect" },
				CONN: {
					id: "CONN",
					type: "connector",
					parentId: "EXTERNAL",
					source: { owner: { id: "A" } },
					target: { owner: { id: "EXTERNAL" } },
				},
			}),
			["CONN"],
			ZERO,
		);

		const newA = idRemap.get("A")!;
		const newConn = idRemap.get("CONN")!;

		expect(newConnectorIds).toEqual([newConn]);
		// コネクターは connectorIds で管理されるためルートへ昇格しない
		expect(newRootIds).toEqual([newA]);
		expect(newObjects[newConn].parentId).toBeUndefined();
		const conn = newObjects[newConn] as unknown as {
			source: { owner: { id: string } };
			target: { owner: { id: string } };
		};
		// 集合内のオーナーは新 ID、集合外のオーナーは元 ID のまま維持される
		expect(conn.source.owner.id).toBe(newA);
		expect(conn.target.owner.id).toBe("EXTERNAL");
	});

	it("rootIds 由来のルートと昇格したルートが重複しても二重登録しない", () => {
		// 内部コピー相当: 選択した子 C は rootIds に含まれるが、親 G は集合外。
		const { newRootIds, idRemap } = cloneObjects(
			["C"],
			objects({
				C: { id: "C", type: "rect", parentId: "G" },
			}),
			[],
			ZERO,
		);

		const newC = idRemap.get("C")!;
		expect(newRootIds).toEqual([newC]);
	});
});
