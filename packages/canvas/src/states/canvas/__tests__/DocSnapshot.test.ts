import { describe, expect, it, vi } from "vitest";

import { createTestRegistries } from "../../../controllers/setup/createCanvasRegistries";
import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import { canvasToDoc, canvasToState } from "../CanvasMapper";
import {
	createDocSnapshotFromDoc,
	createDocSnapshotFromState,
	resolveDocSnapshot,
} from "../DocSnapshot";

const registries = createTestRegistries();
const mapper = registries.objectMapper;

const rectDoc: CanvasDoc = {
	version: 1,
	root: [
		{
			id: "rect-1",
			type: "rect",
			x: 0,
			y: 0,
			width: 10,
			height: 10,
		},
	],
} as unknown as CanvasDoc;

describe("DocSnapshot", () => {
	it("a from-state snapshot converts lazily: no doc until the first resolve", () => {
		const state = canvasToState(rectDoc, mapper);
		const snapshot = createDocSnapshotFromState(state);

		expect(snapshot.doc).toBeNull();

		const resolvedDoc = resolveDocSnapshot(snapshot, mapper);
		expect(resolvedDoc).toEqual(canvasToDoc(state, mapper));
		// The source refs are released once resolved
		expect(snapshot.source).toBeNull();
	});

	it("resolve is memoized: the second call returns the same doc without reconverting", () => {
		const state = canvasToState(rectDoc, mapper);
		const snapshot = createDocSnapshotFromState(state);

		const firstDoc = resolveDocSnapshot(snapshot, mapper);
		const toDocSpy = vi.spyOn(mapper, "toDoc");
		const secondDoc = resolveDocSnapshot(snapshot, mapper);

		expect(secondDoc).toBe(firstDoc);
		expect(toDocSpy).not.toHaveBeenCalled();
		toDocSpy.mockRestore();
	});

	it("a from-doc snapshot returns the original doc verbatim without any conversion", () => {
		const snapshot = createDocSnapshotFromDoc(rectDoc);

		const toDocSpy = vi.spyOn(mapper, "toDoc");
		expect(resolveDocSnapshot(snapshot, mapper)).toBe(rectDoc);
		expect(toDocSpy).not.toHaveBeenCalled();
		toDocSpy.mockRestore();
	});
});
