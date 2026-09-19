// The documents the specs put on disk before opening them. Small on purpose: what
// is under test is the path between the file, the tools and the page, so one shape
// is enough to see the whole of it move.

import type { CanvasFileContent } from "../../src/__tests__/tempCanvasWorkspace";

/**
 * The rectangle {@link singleRectDoc} holds. The specs that move it assert against
 * these numbers, so they are named rather than repeated.
 */
export const SINGLE_RECT = {
	id: "r1",
	x: 40,
	y: 40,
	width: 120,
	height: 80,
} as const;

/** A document holding {@link SINGLE_RECT} and nothing else. */
export const singleRectDoc = (): CanvasFileContent => ({
	version: 1,
	root: [{ type: "rect", ...SINGLE_RECT, text: "hello" }],
});

/**
 * The rectangle {@link twoRectDoc} holds beside {@link SINGLE_RECT}, far enough
 * right that dragging the first one about does not reach it.
 */
export const SECOND_RECT = {
	id: "r2",
	x: 480,
	y: 40,
	width: 120,
	height: 80,
} as const;

/**
 * A document holding {@link SINGLE_RECT} and {@link SECOND_RECT}, for one side to
 * edit one of them while the other side edits the other.
 */
export const twoRectDoc = (): CanvasFileContent => ({
	version: 1,
	root: [
		{ type: "rect", ...SINGLE_RECT, text: "hello" },
		{ type: "rect", ...SECOND_RECT, text: "there" },
	],
});
