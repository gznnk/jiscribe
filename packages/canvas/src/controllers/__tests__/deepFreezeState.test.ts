import { describe, expect, it } from "vitest";

import { deepFreezeState } from "./support/deepFreezeState";
import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import {
	createDocSnapshotFromState,
	resolveDocSnapshot,
} from "../../states/canvas/DocSnapshot";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { createInitialControllerState } from "../reducer/createInitialControllerState";
import { createTestRegistries } from "../registries/createCanvasRegistries";

const registries = createTestRegistries();

const doc: CanvasDoc = {
	version: 1,
	root: [{ id: "rect-1", type: "rect", x: 0, y: 0, width: 40, height: 40 }],
} as unknown as CanvasDoc;

/**
 * deepFreezeState is the mutation detector for the whole test suite (if the
 * freeze silently stops working, all detection disappears), so we assert here
 * that the guard itself is effective.
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
		// the initial state's present is already resolved, so inject a lazy
		// snapshot to exercise the memoization write path.
		const base = createInitialControllerState(doc, registries);
		const state = deepFreezeState({
			...base,
			history: {
				...base.history,
				present: createDocSnapshotFromState(base),
			},
		});

		// resolveDocSnapshot updates the snapshot in place to memoize it (see DocSnapshot.ts).
		// If anything under history is frozen, this throws a TypeError.
		const resolvedDoc = resolveDocSnapshot(
			state.history.present,
			registries.objectMapper,
		);
		expect(resolvedDoc).not.toBeNull();
		expect(state.history.present.doc).toBe(resolvedDoc);
		expect(state.history.present.source).toBeNull();
	});
});
