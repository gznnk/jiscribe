import { beforeAll, describe, expect, it, vi } from "vitest";

import { initializeObjectRegistry } from "../../../controllers/setup/initializeObjectRegistry";
import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import { objectMapperRegistry } from "../../registry/ObjectMapperRegistry";
import { canvasToDoc, canvasToState } from "../CanvasMapper";
import {
	createDocSnapshotFromDoc,
	createDocSnapshotFromState,
	resolveDocSnapshot,
} from "../DocSnapshot";

beforeAll(() => {
	initializeObjectRegistry();
});

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
		const state = canvasToState(rectDoc);
		const snapshot = createDocSnapshotFromState(state);

		expect(snapshot.doc).toBeNull();

		const resolvedDoc = resolveDocSnapshot(snapshot);
		expect(resolvedDoc).toEqual(canvasToDoc(state));
		// The source refs are released once resolved
		expect(snapshot.source).toBeNull();
	});

	it("resolve is memoized: the second call returns the same doc without reconverting", () => {
		const state = canvasToState(rectDoc);
		const snapshot = createDocSnapshotFromState(state);

		const firstDoc = resolveDocSnapshot(snapshot);
		const toDocSpy = vi.spyOn(objectMapperRegistry, "toDoc");
		const secondDoc = resolveDocSnapshot(snapshot);

		expect(secondDoc).toBe(firstDoc);
		expect(toDocSpy).not.toHaveBeenCalled();
		toDocSpy.mockRestore();
	});

	it("a from-doc snapshot returns the original doc verbatim without any conversion", () => {
		const snapshot = createDocSnapshotFromDoc(rectDoc);

		const toDocSpy = vi.spyOn(objectMapperRegistry, "toDoc");
		expect(resolveDocSnapshot(snapshot)).toBe(rectDoc);
		expect(toDocSpy).not.toHaveBeenCalled();
		toDocSpy.mockRestore();
	});
});
