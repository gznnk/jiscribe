import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import { selectConnectorsInSelection } from "../selectConnectorsInSelection";

// ---------------------------------------------------------------------------
// テスト用フィクスチャ
// ---------------------------------------------------------------------------

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

const makeObjects = (
	connectors: ConnectorState[],
): Record<string, ObjectState> => {
	const objects: Record<string, ObjectState> = {};
	for (const conn of connectors) {
		objects[conn.id] = conn as unknown as ObjectState;
	}
	return objects;
};

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe("selectConnectorsInSelection", () => {
	it("両端 owned+選択内 → 含む", () => {
		const conn = makeConnector("c1", "r1", "r2");
		const result = selectConnectorsInSelection(
			["c1"],
			makeObjects([conn]),
			new Set(["r1", "r2"]),
		);
		expect(result).toEqual(["c1"]);
	});

	it("片端 owned+選択内・他端 free → 含む", () => {
		const conn = makeConnector("c1", "r1", null);
		const result = selectConnectorsInSelection(
			["c1"],
			makeObjects([conn]),
			new Set(["r1"]),
		);
		expect(result).toEqual(["c1"]);
	});

	it("片端 free・他端 owned+選択内 → 含む", () => {
		const conn = makeConnector("c1", null, "r1");
		const result = selectConnectorsInSelection(
			["c1"],
			makeObjects([conn]),
			new Set(["r1"]),
		);
		expect(result).toEqual(["c1"]);
	});

	it("両端 free（浮遊コネクター）→ 除外", () => {
		const conn = makeConnector("c1", null, null);
		const result = selectConnectorsInSelection(
			["c1"],
			makeObjects([conn]),
			new Set(["r1"]),
		);
		expect(result).toEqual([]);
	});

	it("片端 owned+選択内・他端 owned+選択外 → 除外", () => {
		const conn = makeConnector("c1", "r1", "r2");
		const result = selectConnectorsInSelection(
			["c1"],
			makeObjects([conn]),
			new Set(["r1"]), // r2 は選択外
		);
		expect(result).toEqual([]);
	});

	it("片端 owned+選択外・他端 free → 除外", () => {
		const conn = makeConnector("c1", "r2", null);
		const result = selectConnectorsInSelection(
			["c1"],
			makeObjects([conn]),
			new Set(["r1"]), // r2 は選択外
		);
		expect(result).toEqual([]);
	});

	it("両端 owned+選択外 → 除外", () => {
		const conn = makeConnector("c1", "r2", "r3");
		const result = selectConnectorsInSelection(
			["c1"],
			makeObjects([conn]),
			new Set(["r1"]), // r2, r3 は選択外
		);
		expect(result).toEqual([]);
	});

	it("存在しないコネクター ID はスキップする", () => {
		const result = selectConnectorsInSelection(
			["missing"],
			{},
			new Set(["r1"]),
		);
		expect(result).toEqual([]);
	});

	it("複数コネクターを入力順を維持して返す", () => {
		const included1 = makeConnector("c1", "r1", "r2");
		const floating = makeConnector("c2", null, null);
		const included2 = makeConnector("c3", "r1", null);
		const result = selectConnectorsInSelection(
			["c1", "c2", "c3"],
			makeObjects([included1, floating, included2]),
			new Set(["r1", "r2"]),
		);
		expect(result).toEqual(["c1", "c3"]);
	});
});
