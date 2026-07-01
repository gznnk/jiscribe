import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import { initializeObjectRegistry } from "../../setup/initializeObjectRegistry";
import { createInitialControllerState } from "../createInitialControllerState";

// canvasToState converts shapes via objectMapperRegistry, so initialization is required
beforeAll(() => {
	initializeObjectRegistry();
});

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
		const state = createInitialControllerState(docWithRect);

		expect(state.objects["rect-1"]).toMatchObject({ cx: 5, cy: 5 });
		expect(state.selectedIds).toEqual([]);
		expect(state.eventStartSnapshot).toBeNull();
		expect(state.multiSelectGroup).toBeNull();
		expect(state.textEditState).toBeNull();
		expect(state.commitVersion).toBe(0);
		expect(state.saveVersion).toBe(0);
	});

	it("history has empty past/future and the initial Doc as present", () => {
		const state = createInitialControllerState(docWithRect);

		expect(state.history.past).toEqual([]);
		expect(state.history.future).toEqual([]);
		expect(state.history.present.root).toHaveLength(1);
	});

	it("returns an independent state on each call (does not share caches, etc.)", () => {
		const a = createInitialControllerState(docWithRect);
		const b = createInitialControllerState(docWithRect);

		expect(a).not.toBe(b);
		expect(a.keyPointsCache).not.toBe(b.keyPointsCache);
		expect(a.history).not.toBe(b.history);
	});
});
