import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import { createInitialControllerState } from "../../reducer/createInitialControllerState";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";
import { cleanupConnectorsOnDelete } from "../cleanupConnectorsOnDelete";

beforeAll(() => {
	initializeObjectRegistry();
});

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
	owner: { type: "rect", id: rectId },
	anchor: { kind: "center" },
});
const free = (x: number, y: number): unknown => ({
	anchor: { kind: "free", point: { x, y } },
});

const buildState = (root: unknown[]) =>
	createInitialControllerState({ version: 1, root } as unknown as CanvasDoc);

describe("cleanupConnectorsOnDelete", () => {
	it("削除対象がコネクターに無関係なら state を据え置く（同一参照）", () => {
		const state = buildState([
			rectDoc("r1", 0, 0),
			rectDoc("r2", 100, 0),
			connDoc("c1", owned("r1"), owned("r2")),
		]);
		const after = cleanupConnectorsOnDelete(state, new Set(["unrelated"]));
		expect(after).toBe(state);
	});

	it("両端の図形を削除するとコネクターも削除され rootIds からも消える", () => {
		const state = buildState([
			rectDoc("r1", 0, 0),
			rectDoc("r2", 100, 0),
			connDoc("c1", owned("r1"), owned("r2")),
		]);
		const after = cleanupConnectorsOnDelete(state, new Set(["r1", "r2"]));
		expect(after.objects["c1"]).toBeUndefined();
		expect(after.rootIds).not.toContain("c1");
	});

	it("片端の図形だけ削除すると、その端が free 化しコネクターは残る", () => {
		const state = buildState([
			rectDoc("r1", 0, 0),
			rectDoc("r2", 100, 0),
			connDoc("c1", owned("r1"), owned("r2")),
		]);
		const after = cleanupConnectorsOnDelete(state, new Set(["r2"]));
		const c1 = after.objects["c1"] as ConnectorState | undefined;
		expect(c1).toBeDefined();
		expect(after.rootIds).toContain("c1");
		// 削除された target(r2)側が free 化、source は owned のまま
		expect(c1?.target.owner).toBeUndefined();
		expect(c1?.source.owner?.id).toBe("r1");
	});

	it("owned+free のコネクターで owned 図形を削除すると両端 free になりコネクター削除", () => {
		const state = buildState([
			rectDoc("r1", 0, 0),
			connDoc("c1", owned("r1"), free(200, 0)),
		]);
		const after = cleanupConnectorsOnDelete(state, new Set(["r1"]));
		expect(after.objects["c1"]).toBeUndefined();
		expect(after.rootIds).not.toContain("c1");
	});
});
