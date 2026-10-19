import { describe, it, expect } from "vitest";

import type { KeyPointsCacheEntry } from "../../CanvasTypes";
import { EMPTY_SELECTION } from "../../selection/CanvasSelection";
import { resetUiState } from "../resetUiState";

describe("resetUiState", () => {
	it("clears every transient field to its empty value", () => {
		expect(resetUiState()).toEqual({
			selection: EMPTY_SELECTION,
			activeDrag: null,
			inertialScrolling: false,
			dragStartCaches: { keyPoints: {}, snapCandidates: null },
			edgeScrollEnabled: false,
			contextMenuPosition: null,
			stencilLibraryDrag: null,
			areaSelection: null,
			objectMenuOpenId: null,
			stencilLibraryOpenCategory: null,
			multiSelectGroup: null,
			textEditState: null,
			connectorDraft: null,
			snapFeedback: null,
			axisLockFeedback: null,
			shapeDrawing: null,
			lastDuplicate: null,
		});
	});

	it("hands out a fresh object every call, so two states cannot share it", () => {
		const first = resetUiState();
		const second = resetUiState();
		expect(first).not.toBe(second);
		expect(first.dragStartCaches).not.toBe(second.dragStartCaches);
	});

	it("hands out the one empty selection, which no write can reach", () => {
		const first = resetUiState();
		const second = resetUiState();
		// The shared reference is what lets a memoized reader skip a clear that
		// changed nothing; it is safe to share because it is frozen.
		expect(first.selection).toBe(second.selection);
		expect(Object.isFrozen(first.selection)).toBe(true);
		expect(Object.isFrozen(first.selection.objectIds)).toBe(true);
	});

	it("hands out containers a later write cannot leak into the next reset", () => {
		const first = resetUiState();
		first.dragStartCaches.keyPoints["a"] = {
			stateRef: { id: "a" } as unknown as KeyPointsCacheEntry["stateRef"],
			keyPoints: {} as KeyPointsCacheEntry["keyPoints"],
		};
		expect(resetUiState().dragStartCaches.keyPoints).toEqual({});
	});
});
