import { describe, expect, it } from "vitest";

import { isConnectorSegmentFreelyMovable } from "../isConnectorSegmentFreelyMovable";

/**
 * The rule the straight hit bands and their drag handler both read: a segment moves as a whole only
 * when neither of its ends is pinned to a shape.
 *
 * `pathLength` counts the drawn path `[source, ...points, target]`, so a connector with n vertices
 * has pathLength n + 2 and n + 1 segments.
 */
describe("isConnectorSegmentFreelyMovable", () => {
	describe("no vertices (a single segment between the endpoints)", () => {
		// The connector invariant forbids both endpoints being free, so the two mixed cases below are
		// the only ones reachable — and neither qualifies.
		it("does not move with the source owned", () => {
			expect(isConnectorSegmentFreelyMovable(0, 2, false, true)).toBe(false);
		});

		it("does not move with the target owned", () => {
			expect(isConnectorSegmentFreelyMovable(0, 2, true, false)).toBe(false);
		});
	});

	describe("one vertex (segments source→v0 and v0→target)", () => {
		it("moves the segment on the free endpoint's side only", () => {
			expect(isConnectorSegmentFreelyMovable(0, 3, true, false)).toBe(true);
			expect(isConnectorSegmentFreelyMovable(1, 3, true, false)).toBe(false);
		});

		it("follows the free endpoint when it is the target", () => {
			expect(isConnectorSegmentFreelyMovable(0, 3, false, true)).toBe(false);
			expect(isConnectorSegmentFreelyMovable(1, 3, false, true)).toBe(true);
		});
	});

	describe("two vertices (segments source→v0, v0→v1, v1→target)", () => {
		it("moves the middle segment even with both endpoints owned", () => {
			expect(isConnectorSegmentFreelyMovable(1, 4, false, false)).toBe(true);
		});

		it("leaves the two end segments pinned", () => {
			expect(isConnectorSegmentFreelyMovable(0, 4, false, false)).toBe(false);
			expect(isConnectorSegmentFreelyMovable(2, 4, false, false)).toBe(false);
		});
	});

	describe("out of range", () => {
		it("rejects a negative index", () => {
			expect(isConnectorSegmentFreelyMovable(-1, 4, true, true)).toBe(false);
		});

		it("rejects an index past the last segment", () => {
			// pathLength 4 has segments 0..2.
			expect(isConnectorSegmentFreelyMovable(3, 4, true, true)).toBe(false);
		});
	});
});
