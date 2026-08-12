import { describe, it, expect } from "vitest";

import type { KeyPointsCacheEntry } from "../../CanvasTypes";
import { resetUiState } from "../resetUiState";

describe("resetUiState", () => {
	it("clears every transient field to its empty value", () => {
		expect(resetUiState()).toEqual({
			selectedIds: [],
			eventStartSnapshot: null,
			activeDragKind: null,
			inertialScrolling: false,
			keyPointsCache: {},
			snapCandidatesCache: null,
			edgeScrollEnabled: false,
			contextMenuPosition: null,
			stencilLibraryDrag: null,
			areaSelection: null,
			objectMenuOpenId: null,
			stencilLibraryOpenCategory: null,
			multiSelectGroup: null,
			textEditState: null,
			pendingConnector: null,
			selectedConnectorId: null,
			selectedVertex: null,
			selectedTextSlot: null,
			editingConnectorId: null,
			editingEndpoint: null,
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
		expect(first.selectedIds).not.toBe(second.selectedIds);
		expect(first.keyPointsCache).not.toBe(second.keyPointsCache);
	});

	it("hands out containers a later write cannot leak into the next reset", () => {
		const first = resetUiState();
		first.selectedIds.push("a");
		first.keyPointsCache["a"] = {
			stateRef: { id: "a" } as unknown as KeyPointsCacheEntry["stateRef"],
			keyPoints: {} as KeyPointsCacheEntry["keyPoints"],
		};
		expect(resetUiState().selectedIds).toEqual([]);
		expect(resetUiState().keyPointsCache).toEqual({});
	});
});
