import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../states/objects/connector/ConnectorState";
import { selectConnectorsInSelection } from "../selectConnectorsInSelection";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const makeConnector = (
	id: string,
	sourceOwnerId: string | null,
	targetOwnerId: string | null,
): ConnectorState => {
	const source =
		sourceOwnerId != null
			? {
					owner: { id: sourceOwnerId },
					anchor: { kind: "center" as const },
				}
			: { anchor: { kind: "free" as const, point: { x: 0, y: 0 } } };
	const target =
		targetOwnerId != null
			? {
					owner: { id: targetOwnerId },
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
// Tests
// ---------------------------------------------------------------------------

describe("selectConnectorsInSelection", () => {
	it("both ends owned + in selection → included", () => {
		const conn = makeConnector("c1", "r1", "r2");
		const result = selectConnectorsInSelection(
			["c1"],
			makeObjects([conn]),
			new Set(["r1", "r2"]),
		);
		expect(result).toEqual(["c1"]);
	});

	it("one end owned + in selection, other end free → included", () => {
		const conn = makeConnector("c1", "r1", null);
		const result = selectConnectorsInSelection(
			["c1"],
			makeObjects([conn]),
			new Set(["r1"]),
		);
		expect(result).toEqual(["c1"]);
	});

	it("one end free, other end owned + in selection → included", () => {
		const conn = makeConnector("c1", null, "r1");
		const result = selectConnectorsInSelection(
			["c1"],
			makeObjects([conn]),
			new Set(["r1"]),
		);
		expect(result).toEqual(["c1"]);
	});

	it("both ends free (floating connector) → excluded", () => {
		const conn = makeConnector("c1", null, null);
		const result = selectConnectorsInSelection(
			["c1"],
			makeObjects([conn]),
			new Set(["r1"]),
		);
		expect(result).toEqual([]);
	});

	it("one end owned + in selection, other end owned + out of selection → excluded", () => {
		const conn = makeConnector("c1", "r1", "r2");
		const result = selectConnectorsInSelection(
			["c1"],
			makeObjects([conn]),
			new Set(["r1"]), // r2 is out of selection
		);
		expect(result).toEqual([]);
	});

	it("one end owned + out of selection, other end free → excluded", () => {
		const conn = makeConnector("c1", "r2", null);
		const result = selectConnectorsInSelection(
			["c1"],
			makeObjects([conn]),
			new Set(["r1"]), // r2 is out of selection
		);
		expect(result).toEqual([]);
	});

	it("both ends owned + out of selection → excluded", () => {
		const conn = makeConnector("c1", "r2", "r3");
		const result = selectConnectorsInSelection(
			["c1"],
			makeObjects([conn]),
			new Set(["r1"]), // r2, r3 are out of selection
		);
		expect(result).toEqual([]);
	});

	it("skips non-existent connector IDs", () => {
		const result = selectConnectorsInSelection(
			["missing"],
			{},
			new Set(["r1"]),
		);
		expect(result).toEqual([]);
	});

	it("returns multiple connectors preserving input order", () => {
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
