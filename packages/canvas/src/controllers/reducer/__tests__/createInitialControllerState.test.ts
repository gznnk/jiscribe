import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import { resolveDocSnapshot } from "../../../states/canvas/DocSnapshot";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { createInitialControllerState } from "../createInitialControllerState";

const registries = createTestRegistries();

const docWithRect: CanvasDoc = {
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

describe("createInitialControllerState", () => {
	it("converts the Doc to state while initializing editing-related defaults to empty", () => {
		const state = createInitialControllerState(docWithRect, registries);

		expect(state.objects["rect-1"]).toMatchObject({ cx: 5, cy: 5 });
		expect(state.selectedIds).toEqual([]);
		expect(state.eventStartSnapshot).toBeNull();
		expect(state.multiSelectGroup).toBeNull();
		expect(state.textEditState).toBeNull();
		expect(state.commitVersion).toBe(0);
		expect(state.saveVersion).toBe(0);
	});

	it("history has empty past/future and the initial Doc as present", () => {
		const state = createInitialControllerState(docWithRect, registries);

		expect(state.history.past).toEqual([]);
		expect(state.history.future).toEqual([]);
		// The initial present wraps the original doc verbatim (no round-trip conversion)
		expect(
			resolveDocSnapshot(state.history.present, registries.objectMapper),
		).toBe(docWithRect);
	});

	it("returns an independent state on each call (does not share caches, etc.)", () => {
		const a = createInitialControllerState(docWithRect, registries);
		const b = createInitialControllerState(docWithRect, registries);

		expect(a).not.toBe(b);
		expect(a.keyPointsCache).not.toBe(b.keyPointsCache);
		expect(a.history).not.toBe(b.history);
	});

	it("keeps the doc-derived default viewport when no initialCamera is given", () => {
		const state = createInitialControllerState(docWithRect, registries);

		// Mapper default: pan at origin, zoom 1 (width/height are placeholders the
		// ResizeObserver corrects at runtime).
		expect(state.viewport).toMatchObject({ minX: 0, minY: 0, zoom: 1 });
	});

	it("seeds the viewport camera from initialCamera without touching width/height", () => {
		const base = createInitialControllerState(docWithRect, registries);
		const state = createInitialControllerState(
			docWithRect,
			registries,
			undefined,
			{
				minX: 10,
				minY: 20,
				zoom: 2,
			},
		);

		// Camera adopted so the first paint lands at the host's pan/zoom (no flash).
		expect(state.viewport).toMatchObject({ minX: 10, minY: 20, zoom: 2 });
		// Width/height stay the mapper default (host does not control pixel size).
		expect(state.viewport.width).toBe(base.viewport.width);
		expect(state.viewport.height).toBe(base.viewport.height);
	});
});
