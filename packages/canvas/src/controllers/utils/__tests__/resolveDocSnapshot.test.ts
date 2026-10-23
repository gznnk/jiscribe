import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it, vi } from "vitest";

import {
	canvasToDoc,
	canvasToState,
} from "../../../states/canvas/CanvasMapper";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import {
	createDocSnapshotFromState,
	dropDocCache,
	resolveDocSnapshot,
} from "../resolveDocSnapshot";

const registries = createTestRegistries();
const mapper = registries.objectMapper;
const contentResizer = registries.objectContentResizer;

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
		const state = canvasToState(rectDoc, mapper, contentResizer);
		const snapshot = createDocSnapshotFromState(state);

		expect(snapshot.doc).toBeNull();

		const resolvedDoc = resolveDocSnapshot(snapshot, mapper);
		expect(resolvedDoc).toEqual(canvasToDoc(state, mapper));
		// The state is kept once resolved: it is what undo restores
		expect(snapshot.source.objects).toBe(state.objects);
	});

	it("resolve is memoized: the second call returns the same doc without reconverting", () => {
		const state = canvasToState(rectDoc, mapper, contentResizer);
		const snapshot = createDocSnapshotFromState(state);

		const firstDoc = resolveDocSnapshot(snapshot, mapper);
		const toDocSpy = vi.spyOn(mapper, "toDoc");
		const secondDoc = resolveDocSnapshot(snapshot, mapper);

		expect(secondDoc).toBe(firstDoc);
		expect(toDocSpy).not.toHaveBeenCalled();
		toDocSpy.mockRestore();
	});

	it("a snapshot created with its doc returns that doc verbatim without any conversion", () => {
		const state = canvasToState(rectDoc, mapper, contentResizer);
		const snapshot = createDocSnapshotFromState(state, rectDoc);

		const toDocSpy = vi.spyOn(mapper, "toDoc");
		expect(resolveDocSnapshot(snapshot, mapper)).toBe(rectDoc);
		expect(toDocSpy).not.toHaveBeenCalled();
		toDocSpy.mockRestore();
		expect(snapshot.source.objects).toBe(state.objects);
	});

	it("dropping the doc cache yields a new entry around the same state and leaves the old one as it was", () => {
		const state = canvasToState(rectDoc, mapper, contentResizer);
		const snapshot = createDocSnapshotFromState(state, rectDoc);

		const dropped = dropDocCache(snapshot);

		expect(dropped).not.toBe(snapshot);
		expect(dropped.doc).toBeNull();
		expect(dropped.source).toBe(snapshot.source);
		expect(dropped.textMeasurementGeneration).toBe(
			snapshot.textMeasurementGeneration,
		);
		expect(snapshot.doc).toBe(rectDoc);
	});

	it("dropping the doc cache of an entry without one returns that entry", () => {
		const snapshot = createDocSnapshotFromState(
			canvasToState(rectDoc, mapper, contentResizer),
		);

		expect(dropDocCache(snapshot)).toBe(snapshot);
	});
});
