import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import { applyActions, command } from "./support/dispatch";
import { rectDoc } from "./support/fixtures";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { ClipboardData } from "../../commands/selection/ClipboardData";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { handlePaste } from "../handlers/handlePaste";

/** One 10x10 rect at the origin, so its center sits at (5, 5). */
const oneRectDoc: CanvasDoc = {
	version: 1,
	root: [rectDoc("rect-1", 0, 0)],
} as unknown as CanvasDoc;

/** A view showing world x 0..1000, y 0..800 — the default, containing the rect. */
const viewportAtOrigin = {
	minX: 0,
	minY: 0,
	width: 1000,
	height: 800,
	zoom: 1,
};

/** A view panned far away; world x 5000..6000, y 4000..4800, centered at (5500, 4400). */
const viewportPannedAway = {
	minX: 5000,
	minY: 4000,
	width: 1000,
	height: 800,
	zoom: 1,
};

/** Copies rect-1 and returns the state it was copied from plus the clipboard payload. */
const copyRect = (
	viewport: CanvasControllerState["viewport"],
): { copied: CanvasControllerState; clipboard: ClipboardData } => {
	const copied = applyActions(
		createTestState(oneRectDoc, { selectedIds: ["rect-1"], viewport }),
		[command("copy")],
	);
	expect(copied.internalClipboard).not.toBeNull();
	return { copied, clipboard: copied.internalClipboard! };
};

const paste = (
	state: CanvasControllerState,
	data: ClipboardData,
): CanvasControllerState => applyActions(state, [{ type: "PASTE", data }]);

/** Center of the only object the paste selected. */
const pastedCenter = (
	state: CanvasControllerState,
): { cx: number; cy: number } => {
	expect(state.selectedIds).toHaveLength(1);
	const pasted = state.objects[state.selectedIds[0]] as unknown as {
		cx: number;
		cy: number;
	};
	return { cx: pasted.cx, cy: pasted.cy };
};

/**
 * Paste places the copy at its original position plus the duplicate offset, unless that
 * would land off screen, in which case it goes to the middle of the view instead.
 */
describe("places a paste relative to the view", () => {
	it("offsets from the original position when the result is visible", () => {
		const { copied, clipboard } = copyRect(viewportAtOrigin);
		expect(pastedCenter(paste(copied, clipboard))).toEqual({ cx: 25, cy: 25 });
	});

	it("centers on the view when the offset position is out of sight", () => {
		const { clipboard } = copyRect(viewportAtOrigin);
		const panned = createTestState(oneRectDoc, {
			viewport: viewportPannedAway,
		});
		expect(pastedCenter(paste(panned, clipboard))).toEqual({
			cx: 5500,
			cy: 4400,
		});
	});

	it("keeps the plain offset while the container is unmeasured", () => {
		const { clipboard } = copyRect(viewportAtOrigin);
		const unmeasured = createTestState(oneRectDoc, {
			viewport: { ...viewportPannedAway, width: 0, height: 0 },
		});
		expect(pastedCenter(paste(unmeasured, clipboard))).toEqual({
			cx: 25,
			cy: 25,
		});
	});
});

/**
 * A repeated paste chains off the copy it just made through lastDuplicate, the same
 * record DuplicateCommand writes, so the copies walk instead of stacking.
 */
describe("stacks repeated pastes", () => {
	it("offsets the second paste from the first instead of overlapping it", () => {
		const { copied, clipboard } = copyRect(viewportAtOrigin);

		const once = paste(copied, clipboard);
		expect(once.lastDuplicate).not.toBeNull();
		expect(once.lastDuplicate?.newIds).toEqual(once.selectedIds);

		const twice = paste(once, clipboard);
		expect(pastedCenter(twice)).toEqual({ cx: 45, cy: 45 });

		const thrice = paste(twice, clipboard);
		expect(pastedCenter(thrice)).toEqual({ cx: 65, cy: 65 });
	});

	it("restarts the walk from the re-centered copy after a view fallback", () => {
		const { clipboard } = copyRect(viewportAtOrigin);
		const panned = createTestState(oneRectDoc, {
			viewport: viewportPannedAway,
		});

		const once = paste(panned, clipboard);
		expect(pastedCenter(once)).toEqual({ cx: 5500, cy: 4400 });

		const twice = paste(once, clipboard);
		expect(pastedCenter(twice)).toEqual({ cx: 5520, cy: 4420 });
	});
});

/**
 * A clipboard holding only connectors has no shape to center, so it keeps the plain
 * offset and leaves no chain behind (nothing lands in selectedIds).
 */
describe("falls back for a connector-only clipboard", () => {
	const freeConnectorClipboard = (): ClipboardData =>
		({
			__type: "jiscribe-canvas-clipboard",
			version: 1,
			objects: {
				"conn-1": {
					id: "conn-1",
					type: "connector",
					points: [{ x: 50, y: 50 }],
					source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
					target: { anchor: { kind: "free", point: { x: 100, y: 100 } } },
				},
			},
			rootIds: ["conn-1"],
			center: { x: 50, y: 50 },
		}) as unknown as ClipboardData;

	it("offsets the connector by the plain offset even with the view panned away", () => {
		const state = createTestState(oneRectDoc, {
			viewport: viewportPannedAway,
		});
		const after = handlePaste(
			state,
			freeConnectorClipboard(),
			createTestRegistries(),
		);

		const pastedId = after.rootIds[after.rootIds.length - 1];
		const pasted = after.objects[pastedId] as unknown as {
			points: { x: number; y: number }[];
		};
		expect(pasted.points).toEqual([{ x: 70, y: 70 }]);
		expect(after.selectedIds).toEqual([]);
		expect(after.lastDuplicate).toBeNull();
	});
});
