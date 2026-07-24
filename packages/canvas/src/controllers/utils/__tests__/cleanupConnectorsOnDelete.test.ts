import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import { deepFreezeState } from "../../__tests__/support/deepFreezeState";
import { createInitialControllerState } from "../../reducer/createInitialControllerState";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { cleanupConnectorsOnDelete } from "../cleanupConnectorsOnDelete";

const registries = createTestRegistries();

const rectDoc = (id: string, x: number, y: number): unknown => ({
	id,
	type: "rect",
	x,
	y,
	width: 40,
	height: 40,
});
const connDoc = (id: string, source: unknown, target: unknown): unknown => ({
	id,
	type: "connector",
	points: [],
	source,
	target,
});
const owned = (rectId: string): unknown => ({
	owner: { id: rectId },
	anchor: { kind: "center" },
});
const free = (x: number, y: number): unknown => ({
	anchor: { kind: "free", point: { x, y } },
});

const buildState = (root: unknown[]) =>
	deepFreezeState(
		createInitialControllerState(
			{ version: 1, root } as unknown as CanvasDoc,
			registries,
		),
	);

describe("cleanupConnectorsOnDelete", () => {
	it("leaves state untouched (same reference) when the deletion target is unrelated to connectors", () => {
		const state = buildState([
			rectDoc("r1", 0, 0),
			rectDoc("r2", 100, 0),
			connDoc("c1", owned("r1"), owned("r2")),
		]);
		const after = cleanupConnectorsOnDelete(state, new Set(["unrelated"]));
		expect(after).toBe(state);
	});

	it("deleting the shapes at both ends also deletes the connector and removes it from rootIds", () => {
		const state = buildState([
			rectDoc("r1", 0, 0),
			rectDoc("r2", 100, 0),
			connDoc("c1", owned("r1"), owned("r2")),
		]);
		const after = cleanupConnectorsOnDelete(state, new Set(["r1", "r2"]));
		expect(after.objects["c1"]).toBeUndefined();
		expect(after.rootIds).not.toContain("c1");
	});

	it("deleting the shape at only one end turns that end free and keeps the connector", () => {
		const state = buildState([
			rectDoc("r1", 0, 0),
			rectDoc("r2", 100, 0),
			connDoc("c1", owned("r1"), owned("r2")),
		]);
		const after = cleanupConnectorsOnDelete(state, new Set(["r2"]));
		const c1 = after.objects["c1"] as ConnectorState | undefined;
		expect(c1).toBeDefined();
		expect(after.rootIds).toContain("c1");
		// the deleted target (r2) side turns free, while source stays owned
		expect(c1?.target.owner).toBeUndefined();
		expect(c1?.source.owner?.id).toBe("r1");
	});

	it("on an owned+free connector, deleting the owned shape makes both ends free and deletes the connector", () => {
		const state = buildState([
			rectDoc("r1", 0, 0),
			connDoc("c1", owned("r1"), free(200, 0)),
		]);
		const after = cleanupConnectorsOnDelete(state, new Set(["r1"]));
		expect(after.objects["c1"]).toBeUndefined();
		expect(after.rootIds).not.toContain("c1");
	});
});
