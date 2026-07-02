import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import {
	DUPLICATE_OFFSET,
	computeDuplicateOffset,
} from "../computeDuplicateOffset";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const makeRect = (id: string, cx: number, cy: number): ObjectState =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as ObjectState;

const makeState = (
	params: Partial<CanvasControllerState> & {
		selectedIds: string[];
		objects: Record<string, ObjectState>;
	},
): CanvasControllerState =>
	({
		multiSelectGroup: null,
		lastDuplicate: null,
		...params,
	}) as unknown as CanvasControllerState;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("computeDuplicateOffset", () => {
	it("no lastDuplicate → default offset", () => {
		const state = makeState({ selectedIds: ["r1"], objects: {} });
		expect(computeDuplicateOffset(state)).toEqual(DUPLICATE_OFFSET);
	});

	it("selection count differs from the previous duplication result → default offset", () => {
		const r1 = makeRect("r1", 0, 0);
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1 },
			lastDuplicate: {
				newIds: ["r1", "r2"],
				cx: 0,
				cy: 0,
				offset: { x: 5, y: 5 },
			},
		});
		expect(computeDuplicateOffset(state)).toEqual(DUPLICATE_OFFSET);
	});

	it("selected IDs do not match the previous duplication result → default offset", () => {
		const r1 = makeRect("r1", 0, 0);
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1 },
			lastDuplicate: {
				newIds: ["other"],
				cx: 0,
				cy: 0,
				offset: { x: 5, y: 5 },
			},
		});
		expect(computeDuplicateOffset(state)).toEqual(DUPLICATE_OFFSET);
	});

	it("selection matches + moved 1px or more → adopts the movement as the new offset", () => {
		const r1 = makeRect("r1", 30, 50);
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1 },
			lastDuplicate: {
				newIds: ["r1"],
				cx: 10,
				cy: 10,
				offset: { x: 5, y: 5 },
			},
		});
		expect(computeDuplicateOffset(state)).toEqual({ x: 20, y: 40 });
	});

	it("selection matches + barely moved (less than 1px) → keeps the previous offset", () => {
		const r1 = makeRect("r1", 10.5, 10.5);
		const state = makeState({
			selectedIds: ["r1"],
			objects: { r1 },
			lastDuplicate: {
				newIds: ["r1"],
				cx: 10,
				cy: 10,
				offset: { x: 7, y: 7 },
			},
		});
		expect(computeDuplicateOffset(state)).toEqual({ x: 7, y: 7 });
	});

	it("selection matches but the center cannot be obtained → keeps the previous offset", () => {
		const state = makeState({
			selectedIds: ["gone"],
			objects: {},
			lastDuplicate: {
				newIds: ["gone"],
				cx: 10,
				cy: 10,
				offset: { x: 9, y: 9 },
			},
		});
		expect(computeDuplicateOffset(state)).toEqual({ x: 9, y: 9 });
	});
});
