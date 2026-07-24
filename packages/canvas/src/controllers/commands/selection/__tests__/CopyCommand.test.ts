import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { CopyCommand } from "../CopyCommand";

const registries = createTestRegistries();

// ---------------------------------------------------------------------------
// Test fixtures
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

const makeState = (params: {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	rootIds: string[];
	connectorIds: string[];
}): CanvasControllerState =>
	({
		selectedIds: params.selectedIds,
		objects: params.objects,
		// connectors are managed interleaved in rootIds rather than a separate array, so include them in rootIds.
		rootIds: [...params.rootIds, ...params.connectorIds],
		commitVersion: 0,
		multiSelectGroup: null,
		internalClipboard: null,
	}) as unknown as CanvasControllerState;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CopyCommand — connector inclusion decision", () => {
	it("both ends owned + in selection → includes the connector", () => {
		const r1 = makeRect("r1");
		const r2 = makeRect("r2");
		const conn = makeConnector("conn1", "r1", "r2");
		const state = makeState({
			selectedIds: ["r1", "r2"],
			objects: { r1, r2, conn1: conn },
			rootIds: ["r1", "r2"],
			connectorIds: ["conn1"],
		});
		const next = CopyCommand.execute(state, registries);
		expect(next.internalClipboard?.rootIds).toContain("conn1");
	});

	it("one end owned + in selection, other end free → includes the connector", () => {
		const r1 = makeRect("r1");
		const conn = makeConnector("conn1", "r1", null);
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1, conn1: conn },
			rootIds: ["r1"],
			connectorIds: ["conn1"],
		});
		const next = CopyCommand.execute(state, registries);
		expect(next.internalClipboard?.rootIds).toContain("conn1");
	});

	it("one end free, other end owned + in selection → includes the connector", () => {
		const r1 = makeRect("r1");
		const conn = makeConnector("conn1", null, "r1");
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1, conn1: conn },
			rootIds: ["r1"],
			connectorIds: ["conn1"],
		});
		const next = CopyCommand.execute(state, registries);
		expect(next.internalClipboard?.rootIds).toContain("conn1");
	});

	it("both ends free → excludes the connector (floating connector)", () => {
		const r1 = makeRect("r1");
		const conn = makeConnector("conn1", null, null);
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1, conn1: conn },
			rootIds: ["r1"],
			connectorIds: ["conn1"],
		});
		const next = CopyCommand.execute(state, registries);
		expect(next.internalClipboard?.rootIds).not.toContain("conn1");
	});

	it("one end owned + in selection, other end owned + out of selection → excludes the connector", () => {
		const r1 = makeRect("r1");
		const r2 = makeRect("r2");
		const conn = makeConnector("conn1", "r1", "r2");
		const state = makeState({
			selectedIds: ["r1"], // r2 is not selected
			objects: { r1, r2, conn1: conn },
			rootIds: ["r1", "r2"],
			connectorIds: ["conn1"],
		});
		const next = CopyCommand.execute(state, registries);
		expect(next.internalClipboard?.rootIds).not.toContain("conn1");
	});

	it("one end owned + out of selection, other end free → excludes the connector", () => {
		const r1 = makeRect("r1");
		const r2 = makeRect("r2");
		const conn = makeConnector("conn1", "r2", null); // r2 is not selected
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1, r2, conn1: conn },
			rootIds: ["r1", "r2"],
			connectorIds: ["conn1"],
		});
		const next = CopyCommand.execute(state, registries);
		expect(next.internalClipboard?.rootIds).not.toContain("conn1");
	});

	it("both ends owned + out of selection → excludes the connector", () => {
		const r1 = makeRect("r1");
		const r2 = makeRect("r2");
		const r3 = makeRect("r3");
		const conn = makeConnector("conn1", "r2", "r3"); // r2, r3 are not selected
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1, r2, r3, conn1: conn },
			rootIds: ["r1", "r2", "r3"],
			connectorIds: ["conn1"],
		});
		const next = CopyCommand.execute(state, registries);
		expect(next.internalClipboard?.rootIds).not.toContain("conn1");
	});
});

describe("CopyCommand — basic clipboard behavior", () => {
	it("selected objects are included in internalClipboard's objects and rootIds", () => {
		const r1 = makeRect("r1");
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1 },
			rootIds: ["r1"],
			connectorIds: [],
		});
		const next = CopyCommand.execute(state, registries);
		expect(next.internalClipboard?.rootIds).toEqual(["r1"]);
		expect(next.internalClipboard?.objects["r1"]).toBeDefined();
	});

	it("canExecute is false when selectedIds is empty", () => {
		const state = makeState({
			selectedIds: [],
			objects: {},
			rootIds: [],
			connectorIds: [],
		});
		expect(CopyCommand.canExecute(state, registries)).toBe(false);
	});

	it("canExecute is true when there are selectedIds", () => {
		const r1 = makeRect("r1");
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1 },
			rootIds: ["r1"],
			connectorIds: [],
		});
		expect(CopyCommand.canExecute(state, registries)).toBe(true);
	});
});
