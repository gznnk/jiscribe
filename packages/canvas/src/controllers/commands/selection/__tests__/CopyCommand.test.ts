import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { CopyCommand } from "../CopyCommand";

// ---------------------------------------------------------------------------
// テスト用フィクスチャ
// ---------------------------------------------------------------------------

const makeRect = (id: string): ObjectState =>
	({
		id,
		type: "rect",
		cx: 0,
		cy: 0,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as ObjectState;

const makeConnector = (
	id: string,
	sourceOwnerId: string | null,
	targetOwnerId: string | null,
): ConnectorState => {
	const source =
		sourceOwnerId != null
			? {
					owner: { id: sourceOwnerId, type: "rect" as const },
					anchor: { kind: "center" as const },
				}
			: { anchor: { kind: "free" as const, point: { x: 0, y: 0 } } };
	const target =
		targetOwnerId != null
			? {
					owner: { id: targetOwnerId, type: "rect" as const },
					anchor: { kind: "center" as const },
				}
			: { anchor: { kind: "free" as const, point: { x: 100, y: 100 } } };
	return {
		id,
		type: "connector",
		points: [],
		source,
		target,
	} as unknown as ConnectorState;
};

const makeState = (params: {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	rootIds: string[];
	connectorIds: string[];
}): CanvasControllerState =>
	({
		selectedIds: params.selectedIds,
		objects: params.objects,
		// コネクターは独立配列ではなく rootIds に混在管理されるため rootIds へ含める。
		rootIds: [...params.rootIds, ...params.connectorIds],
		commitVersion: 0,
		multiSelectGroup: null,
		internalClipboard: null,
	}) as unknown as CanvasControllerState;

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe("CopyCommand — コネクター包含判定", () => {
	it("両端 owned+選択内 → コネクターを含む", () => {
		const r1 = makeRect("r1");
		const r2 = makeRect("r2");
		const conn = makeConnector("conn1", "r1", "r2");
		const state = makeState({
			selectedIds: ["r1", "r2"],
			objects: { r1, r2, conn1: conn },
			rootIds: ["r1", "r2"],
			connectorIds: ["conn1"],
		});
		const next = CopyCommand.execute(state);
		expect(next.internalClipboard?.connectorIds).toContain("conn1");
	});

	it("片端 owned+選択内・他端 free → コネクターを含む", () => {
		const r1 = makeRect("r1");
		const conn = makeConnector("conn1", "r1", null);
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1, conn1: conn },
			rootIds: ["r1"],
			connectorIds: ["conn1"],
		});
		const next = CopyCommand.execute(state);
		expect(next.internalClipboard?.connectorIds).toContain("conn1");
	});

	it("片端 free・他端 owned+選択内 → コネクターを含む", () => {
		const r1 = makeRect("r1");
		const conn = makeConnector("conn1", null, "r1");
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1, conn1: conn },
			rootIds: ["r1"],
			connectorIds: ["conn1"],
		});
		const next = CopyCommand.execute(state);
		expect(next.internalClipboard?.connectorIds).toContain("conn1");
	});

	it("両端 free → コネクターを除外（浮遊コネクター）", () => {
		const r1 = makeRect("r1");
		const conn = makeConnector("conn1", null, null);
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1, conn1: conn },
			rootIds: ["r1"],
			connectorIds: ["conn1"],
		});
		const next = CopyCommand.execute(state);
		expect(next.internalClipboard?.connectorIds).not.toContain("conn1");
	});

	it("片端 owned+選択内・他端 owned+選択外 → コネクターを除外", () => {
		const r1 = makeRect("r1");
		const r2 = makeRect("r2");
		const conn = makeConnector("conn1", "r1", "r2");
		const state = makeState({
			selectedIds: ["r1"], // r2 は選択していない
			objects: { r1, r2, conn1: conn },
			rootIds: ["r1", "r2"],
			connectorIds: ["conn1"],
		});
		const next = CopyCommand.execute(state);
		expect(next.internalClipboard?.connectorIds).not.toContain("conn1");
	});

	it("片端 owned+選択外・他端 free → コネクターを除外", () => {
		const r1 = makeRect("r1");
		const r2 = makeRect("r2");
		const conn = makeConnector("conn1", "r2", null); // r2 は選択していない
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1, r2, conn1: conn },
			rootIds: ["r1", "r2"],
			connectorIds: ["conn1"],
		});
		const next = CopyCommand.execute(state);
		expect(next.internalClipboard?.connectorIds).not.toContain("conn1");
	});

	it("両端 owned+選択外 → コネクターを除外", () => {
		const r1 = makeRect("r1");
		const r2 = makeRect("r2");
		const r3 = makeRect("r3");
		const conn = makeConnector("conn1", "r2", "r3"); // r2, r3 は選択していない
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1, r2, r3, conn1: conn },
			rootIds: ["r1", "r2", "r3"],
			connectorIds: ["conn1"],
		});
		const next = CopyCommand.execute(state);
		expect(next.internalClipboard?.connectorIds).not.toContain("conn1");
	});
});

describe("CopyCommand — クリップボード基本挙動", () => {
	it("選択オブジェクトが internalClipboard の objects と rootIds に含まれる", () => {
		const r1 = makeRect("r1");
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1 },
			rootIds: ["r1"],
			connectorIds: [],
		});
		const next = CopyCommand.execute(state);
		expect(next.internalClipboard?.rootIds).toEqual(["r1"]);
		expect(next.internalClipboard?.objects["r1"]).toBeDefined();
	});

	it("canExecute は selectedIds が空のとき false", () => {
		const state = makeState({
			selectedIds: [],
			objects: {},
			rootIds: [],
			connectorIds: [],
		});
		expect(CopyCommand.canExecute(state)).toBe(false);
	});

	it("canExecute は selectedIds がある場合 true", () => {
		const r1 = makeRect("r1");
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1 },
			rootIds: ["r1"],
			connectorIds: [],
		});
		expect(CopyCommand.canExecute(state)).toBe(true);
	});
});
