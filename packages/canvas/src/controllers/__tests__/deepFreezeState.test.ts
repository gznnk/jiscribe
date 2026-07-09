import { beforeAll, describe, expect, it } from "vitest";

import { deepFreezeState } from "./support/deepFreezeState";
import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import {
	createDocSnapshotFromState,
	resolveDocSnapshot,
} from "../../states/canvas/DocSnapshot";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { createInitialControllerState } from "../reducer/createInitialControllerState";
import { createTestRegistries } from "../setup/createCanvasRegistries";
import { initializeObjectRegistry } from "../setup/initializeObjectRegistry";

beforeAll(() => {
	initializeObjectRegistry();
});

const registries = createTestRegistries();

const doc: CanvasDoc = {
	version: 1,
	root: [{ id: "rect-1", type: "rect", x: 0, y: 0, width: 40, height: 40 }],
} as unknown as CanvasDoc;

/**
 * deepFreezeState はテスト全体のミューテート検知器（凍結が黙って外れると
 * 検知が丸ごと消える）ため、ガード自体の効きをここで担保する。
 */
describe("deepFreezeState", () => {
	it("throws on in-place mutation of objects / rootIds / nested object state", () => {
		const state = deepFreezeState(
			createInitialControllerState(doc, registries),
		);

		expect(() => {
			(state.objects as Record<string, ObjectState>)["new-id"] = {
				id: "new-id",
			} as unknown as ObjectState;
		}).toThrow(TypeError);
		expect(() => {
			(state.rootIds as string[]).push("new-id");
		}).toThrow(TypeError);
		expect(() => {
			(state.objects["rect-1"] as unknown as { cx: number }).cx = 999;
		}).toThrow(TypeError);
		expect(() => {
			(state as { commitVersion: number }).commitVersion = 99;
		}).toThrow(TypeError);
	});

	it("keeps history unfrozen so resolveDocSnapshot's write-once memoization works", () => {
		// 初期 state の present は resolved 済みなので、lazy な snapshot を注入して
		// メモ化の書き込みパスを踏ませる。
		const base = createInitialControllerState(doc, registries);
		const state = deepFreezeState({
			...base,
			history: {
				...base.history,
				present: createDocSnapshotFromState(base),
			},
		});

		// resolveDocSnapshot は snapshot を in-place 更新してメモ化する（DocSnapshot.ts 参照）。
		// history 配下が凍結されているとここで TypeError になる。
		const resolvedDoc = resolveDocSnapshot(
			state.history.present,
			registries.objectMapper,
		);
		expect(resolvedDoc).not.toBeNull();
		expect(state.history.present.doc).toBe(resolvedDoc);
		expect(state.history.present.source).toBeNull();
	});
});
